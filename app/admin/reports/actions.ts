'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, uniqueViolation, type FormState } from '@/lib/forms';
import { contentHash } from '@/lib/hash';
import {
  freeReportSlug,
  removeAllReportImages,
  removeReportImage,
  storeReportImage,
} from '@/lib/reports';
import { REPORT_ARRAYS, reportSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();

export async function saveReport(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(reportSchema, fd, REPORT_ARRAYS);
  if (!parsed.ok) return parsed.state;
  const { authorIds, slug: requestedSlug, ...d } = parsed.data;
  if (authorIds.length === 0) {
    return {
      error: 'Укажите хотя бы одного автора',
      fieldErrors: { authorIds: 'Нужен автор' },
      values: parsed.values,
    };
  }
  const existingId = idSchema.safeParse(fd.get('id'));
  const ownId = existingId.success ? existingId.data : undefined;

  let previousStatus: string | null = null;
  if (ownId) {
    const { data } = await db().from('reports').select('status').eq('id', ownId).maybeSingle();
    previousStatus = data?.status ?? null;
  }

  const slug = requestedSlug ?? (await freeReportSlug(d.library, d.title, ownId));
  const report = {
    ...d,
    slug,
    lesson_id: d.lesson_id ?? null,
    review_comment: d.review_comment ?? null,
    content_hash: contentHash(d.content_md),
    ...(d.status !== 'pending' && previousStatus !== d.status
      ? { reviewed_at: new Date().toISOString() }
      : d.status === 'pending'
        ? { reviewed_at: null }
        : {}),
  };
  const duplicate = 'Доклад с таким адресом (slug) или точно таким же текстом уже есть.';

  let id: number;
  if (ownId) {
    id = ownId;
    const { error } = await db().from('reports').update(report).eq('id', id);
    if (error) return uniqueViolation(error, duplicate, parsed.values);
    const { error: delError } = await db().from('report_authors').delete().eq('report_id', id);
    if (delError) throw new Error(delError.message);
  } else {
    const { data, error } = await db().from('reports').insert(report).select('id').single();
    if (error) return uniqueViolation(error, duplicate, parsed.values);
    id = data.id;
  }
  const { error: authorsError } = await db()
    .from('report_authors')
    .insert(authorIds.map((student_id) => ({ report_id: id, student_id })));
  if (authorsError) throw new Error(authorsError.message);

  await audit({
    actor: 'teacher',
    action: ownId ? 'report.update' : 'report.create',
    entity: 'report',
    entityId: id,
    meta: { status: d.status, slug },
  });
  revalidatePath('/admin/reports');
  redirect(`/admin/reports/${id}?saved=1`);
}

export async function deleteReport(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  await removeAllReportImages(id);
  const { error } = await db().from('reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'report.delete', entity: 'report', entityId: id });
  revalidatePath('/admin/reports');
  redirect('/admin/reports');
}

/** One image per call: keeps each request well under Vercel's 4.5 MB body limit. */
export async function uploadReportAsset(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const reportId = idSchema.parse(fd.get('reportId'));
  const stored = await storeReportImage(reportId, fd.get('file'));
  if (!stored.ok) return { error: stored.error };
  await audit({
    actor: 'teacher',
    action: 'report.asset.upload',
    entity: 'report',
    entityId: reportId,
    meta: { path: stored.path },
  });
  revalidatePath(`/admin/reports/${reportId}`);
  return { ok: `Загружено. Вставьте в текст: ![описание](${stored.name})` };
}

export async function deleteReportAsset(fd: FormData): Promise<void> {
  await requireTeacher();
  const asset = await removeReportImage(idSchema.parse(fd.get('assetId')));
  if (!asset) return;
  await audit({
    actor: 'teacher',
    action: 'report.asset.delete',
    entity: 'report',
    entityId: asset.report_id,
    meta: { path: asset.path },
  });
  revalidatePath(`/admin/reports/${asset.report_id}`);
}
