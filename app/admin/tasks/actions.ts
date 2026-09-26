'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, type FormState } from '@/lib/forms';
import { taskSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();

export async function saveTask(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(taskSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const task = {
    ...d,
    assigned_student_id: d.assigned_student_id ?? null,
    runtime_ms: d.runtime_ms ?? null,
    memory_mb: d.memory_mb ?? null,
  };
  const existingId = idSchema.safeParse(fd.get('id'));

  let id: number;
  if (existingId.success) {
    id = existingId.data;
    const { error } = await db().from('tasks').update(task).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db().from('tasks').insert(task).select('id').single();
    if (error) throw new Error(error.message);
    id = data.id;
  }

  await audit({
    actor: 'teacher',
    action: existingId.success ? 'task.update' : 'task.create',
    entity: 'task',
    entityId: id,
    meta: { status: task.status, verdict: task.verdict },
  });
  revalidatePath('/admin/tasks');
  redirect(`/admin/tasks/${id}?saved=1`);
}

export async function deleteTask(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { data, error } = await db()
    .from('tasks')
    .delete()
    .eq('id', id)
    .select('lesson_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'task.delete', entity: 'task', entityId: id });
  revalidatePath('/admin/tasks');
  redirect(data ? `/admin/lessons/${data.lesson_id}` : '/admin/tasks');
}
