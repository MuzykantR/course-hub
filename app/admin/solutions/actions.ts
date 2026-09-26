'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { scheduleExport } from '@/lib/github/export';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, uniqueViolation, type FormState } from '@/lib/forms';
import { contentHash } from '@/lib/hash';
import { solutionSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();

export async function saveSolution(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(solutionSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const existingId = idSchema.safeParse(fd.get('id'));

  let previousStatus: string | null = null;
  if (existingId.success) {
    const { data } = await db()
      .from('solutions')
      .select('status')
      .eq('id', existingId.data)
      .maybeSingle();
    previousStatus = data?.status ?? null;
  }
  const solution = {
    ...d,
    explanation_md: d.explanation_md?.trim() ? d.explanation_md : null,
    review_comment: d.review_comment ?? null,
    content_hash: contentHash(d.code),
    // Stamp the moment of the decision; editing an already-reviewed solution keeps it.
    ...(d.status !== 'pending' && previousStatus !== d.status
      ? { reviewed_at: new Date().toISOString() }
      : d.status === 'pending'
        ? { reviewed_at: null }
        : {}),
  };

  let id: number;
  if (existingId.success) {
    id = existingId.data;
    const { error } = await db().from('solutions').update(solution).eq('id', id);
    if (error) return uniqueViolation(error, 'У этой задачи уже есть решение с таким же кодом.', parsed.values);
  } else {
    const { data, error } = await db().from('solutions').insert(solution).select('id').single();
    if (error) return uniqueViolation(error, 'У этой задачи уже есть решение с таким же кодом.', parsed.values);
    id = data.id;
  }

  await audit({
    actor: 'teacher',
    action: existingId.success ? 'solution.update' : 'solution.create',
    entity: 'solution',
    entityId: id,
    meta: { status: d.status, task_id: d.task_id },
  });
  scheduleExport('решение');
  revalidatePath('/admin/solutions');
  redirect(`/admin/solutions/${id}?saved=1`);
}

export async function deleteSolution(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { data, error } = await db()
    .from('solutions')
    .delete()
    .eq('id', id)
    .select('task_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'solution.delete', entity: 'solution', entityId: id });
  scheduleExport('удалено решение');
  revalidatePath('/admin/solutions');
  redirect(data ? `/admin/solutions?task=${data.task_id}` : '/admin/solutions');
}
