'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireIdentifiedStudent } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, type FormState } from '@/lib/forms';
import { contentHash } from '@/lib/hash';
import { limiter, RATE_RULES } from '@/lib/ratelimit';
import { freeReportSlug, removeReportImage, REPORT_BUCKET, storeReportImage } from '@/lib/reports';
import { clientIp } from '@/lib/request';
import { HONEYPOT_FIELD, reserveSubmissionSlots, submissionPrecheck } from '@/lib/submissions';
import { isHoneypotFilled } from '@/lib/submissions-core';
import {
  REPORT_SUBMIT_ARRAYS,
  reportSubmitSchema,
  solutionSubmitSchema,
} from '@/lib/validation/submit';

const idSchema = z.coerce.number().int().positive();

/** Shared gate for both kinds of submission. Returns an error state or the student id + ip. */
async function gate(fd: FormData, what: string) {
  const session = await requireIdentifiedStudent();
  const ip = await clientIp();
  if (isHoneypotFilled(fd.get(HONEYPOT_FIELD))) {
    // Pretend it worked so a bot learns nothing; keep a trace for the teacher.
    await audit({
      actor: `student:${session.studentId}`,
      action: `${what}.honeypot`,
      entity: what,
      meta: { ip },
    });
    redirect('/me?sent=1');
  }
  const blocked = await submissionPrecheck(session.studentId);
  if (blocked) return { error: blocked } as const;
  return { studentId: session.studentId, ip } as const;
}

export async function submitSolution(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireIdentifiedStudent();
  const parsed = parseForm(solutionSubmitSchema, fd);
  if (!parsed.ok) return parsed.state;
  const g = await gate(fd, 'solution');
  if ('error' in g) return { error: g.error, values: parsed.values };

  const { data: task, error: taskError } = await db()
    .from('tasks')
    .select('id')
    .eq('id', parsed.data.task_id)
    .neq('status', 'draft')
    .maybeSingle();
  if (taskError) throw new Error(taskError.message);
  if (!task) return { error: 'Такой задачи нет', values: parsed.values };

  const slots = await reserveSubmissionSlots(g.studentId, g.ip);
  if (!slots.ok) return { error: slots.error, values: parsed.values };

  const { data, error } = await db()
    .from('solutions')
    .insert({
      task_id: task.id,
      author_student_id: g.studentId,
      code: parsed.data.code,
      explanation_md: parsed.data.explanation_md?.trim() ? parsed.data.explanation_md : null,
      status: 'pending',
      content_hash: contentHash(parsed.data.code),
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { error: 'Точно такое же решение этой задачи уже отправляли.', values: parsed.values };
    }
    throw new Error(error.message);
  }

  await audit({
    actor: `student:${g.studentId}`,
    action: 'solution.submit',
    entity: 'solution',
    entityId: data.id,
    meta: { ip: g.ip, task_id: task.id },
  });
  revalidatePath('/me');
  redirect('/me?sent=solution');
}

export async function submitReport(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireIdentifiedStudent();
  const parsed = parseForm(reportSubmitSchema, fd, REPORT_SUBMIT_ARRAYS);
  if (!parsed.ok) return parsed.state;
  const g = await gate(fd, 'report');
  if ('error' in g) return { error: g.error, values: parsed.values };
  const d = parsed.data;

  const { data: me, error: meError } = await db()
    .from('students')
    .select('group_id')
    .eq('id', g.studentId)
    .single();
  if (meError) throw new Error(meError.message);

  const coauthors = [...new Set(d.coauthorIds)].filter((id) => id !== g.studentId);
  if (coauthors.length) {
    const { count, error } = await db()
      .from('students')
      .select('id', { count: 'exact', head: true })
      .in('id', coauthors);
    if (error) throw new Error(error.message);
    if (count !== coauthors.length) return { error: 'Соавтор не найден', values: parsed.values };
  }
  if (d.lesson_id) {
    const { data: lesson } = await db()
      .from('lessons')
      .select('id')
      .eq('id', d.lesson_id)
      .maybeSingle();
    if (!lesson) return { error: 'Такого занятия нет', values: parsed.values };
  }

  const slots = await reserveSubmissionSlots(g.studentId, g.ip);
  if (!slots.ok) return { error: slots.error, values: parsed.values };

  const { data: report, error } = await db()
    .from('reports')
    .insert({
      slug: await freeReportSlug('', d.title),
      title: d.title,
      summary: d.summary,
      content_md: d.content_md,
      group_id: me.group_id,
      lesson_id: d.lesson_id ?? null,
      tags: d.tags,
      status: 'pending',
      content_hash: contentHash(d.content_md),
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { error: 'Доклад с точно таким же текстом уже есть.', values: parsed.values };
    }
    throw new Error(error.message);
  }
  const { error: authorsError } = await db()
    .from('report_authors')
    .insert(
      [g.studentId, ...coauthors].map((student_id) => ({ report_id: report.id, student_id })),
    );
  if (authorsError) throw new Error(authorsError.message);

  await audit({
    actor: `student:${g.studentId}`,
    action: 'report.submit',
    entity: 'report',
    entityId: report.id,
    meta: { ip: g.ip, coauthors },
  });
  revalidatePath('/me');
  redirect(`/me/reports/${report.id}?sent=1`);
}

/** A pending report where the current student is an author, or null. */
async function ownPendingReport(studentId: number, reportId: number) {
  const { data, error } = await db()
    .from('report_authors')
    .select('report:reports!inner(id, status)')
    .eq('student_id', studentId)
    .eq('report_id', reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.report.status === 'pending' ? data.report : null;
}

export async function withdrawSubmission(fd: FormData): Promise<void> {
  const { studentId } = await requireIdentifiedStudent();
  const kind = z.enum(['solution', 'report']).parse(fd.get('kind'));
  const id = idSchema.parse(fd.get('id'));

  if (kind === 'solution') {
    const { error } = await db()
      .from('solutions')
      .delete()
      .eq('id', id)
      .eq('author_student_id', studentId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
  } else {
    if (!(await ownPendingReport(studentId, id))) return;
    // Delete the row first (only while still pending), then the files: if the teacher approves
    // in between, nothing is deleted and the published report keeps its images.
    const { data: paths } = await db().from('report_assets').select('path').eq('report_id', id);
    const { data: deleted, error } = await db()
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    if (error) throw new Error(error.message);
    if (!deleted.length) return;
    if (paths?.length)
      await db()
        .storage.from(REPORT_BUCKET)
        .remove(paths.map((p) => p.path));
  }
  await audit({
    actor: `student:${studentId}`,
    action: `${kind}.withdraw`,
    entity: kind,
    entityId: id,
  });
  revalidatePath('/me');
  redirect('/me');
}

export async function uploadOwnReportImage(_prev: FormState, fd: FormData): Promise<FormState> {
  const { studentId } = await requireIdentifiedStudent();
  const reportId = idSchema.parse(fd.get('reportId'));
  if (!(await ownPendingReport(studentId, reportId))) {
    return { error: 'Картинки можно добавлять только к своему докладу на проверке.' };
  }
  const slot = await limiter.reserve(`upload:student:${studentId}`, RATE_RULES.uploadStudent);
  if (!slot.allowed) return { error: 'Слишком много загрузок за сутки.' };

  const stored = await storeReportImage(reportId, fd.get('file'));
  if (!stored.ok) return { error: stored.error };
  await audit({
    actor: `student:${studentId}`,
    action: 'report.asset.upload',
    entity: 'report',
    entityId: reportId,
    meta: { path: stored.path },
  });
  revalidatePath(`/me/reports/${reportId}`);
  return {
    ok: `Загружено. Вставьте в текст: ![описание](${stored.name}) — текст можно поправить, отозвав и отправив доклад заново.`,
  };
}

export async function deleteOwnReportImage(fd: FormData): Promise<void> {
  const { studentId } = await requireIdentifiedStudent();
  const reportId = idSchema.parse(fd.get('reportId'));
  const assetId = idSchema.parse(fd.get('assetId'));
  if (!(await ownPendingReport(studentId, reportId))) return;
  const removed = await removeReportImage(assetId, reportId);
  if (removed) {
    await audit({
      actor: `student:${studentId}`,
      action: 'report.asset.delete',
      entity: 'report',
      entityId: reportId,
      meta: { path: removed.path },
    });
  }
  revalidatePath(`/me/reports/${reportId}`);
}
