'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, type FormState } from '@/lib/forms';
import { LESSON_ARRAYS, lessonSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();

export async function saveLesson(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(lessonSchema, fd, LESSON_ARRAYS);
  if (!parsed.ok) return parsed.state;
  const { groupIds, ...lesson } = parsed.data;
  const existingId = idSchema.safeParse(fd.get('id'));

  let id: number;
  if (existingId.success) {
    id = existingId.data;
    const { error } = await db().from('lessons').update(lesson).eq('id', id);
    if (error) throw new Error(error.message);
    const { error: delError } = await db().from('lesson_groups').delete().eq('lesson_id', id);
    if (delError) throw new Error(delError.message);
  } else {
    const { data, error } = await db().from('lessons').insert(lesson).select('id').single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  if (groupIds.length) {
    const { error } = await db()
      .from('lesson_groups')
      .insert(groupIds.map((group_id) => ({ lesson_id: id, group_id })));
    if (error) throw new Error(error.message);
  }

  await audit({
    actor: 'teacher',
    action: existingId.success ? 'lesson.update' : 'lesson.create',
    entity: 'lesson',
    entityId: id,
  });
  revalidatePath('/admin/lessons');
  redirect(`/admin/lessons/${id}?saved=1`);
}

export async function deleteLesson(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { error } = await db().from('lessons').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'lesson.delete', entity: 'lesson', entityId: id });
  revalidatePath('/admin/lessons');
  redirect('/admin/lessons');
}
