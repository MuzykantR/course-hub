'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { parseForm, uniqueViolation, type FormState } from '@/lib/forms';
import { slugify, uniqueSlug } from '@/lib/slug';
import { groupSchema, importStudentsSchema, studentSchema } from '@/lib/validation/admin';

const idSchema = z.coerce.number().int().positive();

async function takenSlugs(table: 'groups' | 'students', exceptId?: number): Promise<string[]> {
  const { data, error } = await db().from(table).select('id, slug');
  if (error) throw new Error(error.message);
  return data.filter((r) => r.id !== exceptId).map((r) => r.slug);
}

// ───────── groups ─────────

export async function saveGroup(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(groupSchema, fd);
  if (!parsed.ok) return parsed.state;
  const existingId = idSchema.safeParse(fd.get('id'));
  const ownId = existingId.success ? existingId.data : undefined;
  const slug =
    parsed.data.slug ??
    uniqueSlug(slugify(parsed.data.name) || 'group', await takenSlugs('groups', ownId));

  let id: number;
  if (ownId) {
    id = ownId;
    const { error } = await db()
      .from('groups')
      .update({ name: parsed.data.name, slug })
      .eq('id', id);
    if (error) return uniqueViolation(error, 'Такой адрес группы уже занят.', parsed.values);
  } else {
    const { data, error } = await db()
      .from('groups')
      .insert({ name: parsed.data.name, slug })
      .select('id')
      .single();
    if (error) return uniqueViolation(error, 'Такой адрес группы уже занят.', parsed.values);
    id = data.id;
  }
  await audit({
    actor: 'teacher',
    action: ownId ? 'group.update' : 'group.create',
    entity: 'group',
    entityId: id,
  });
  revalidatePath('/admin/groups');
  redirect(`/admin/groups/${id}`);
}

export async function deleteGroup(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  // students.group_id is ON DELETE RESTRICT: the page only offers this for empty groups.
  const { error } = await db().from('groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'group.delete', entity: 'group', entityId: id });
  revalidatePath('/admin/groups');
  redirect('/admin/groups');
}

// ───────── students ─────────

export async function importStudents(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(importStudentsSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { group_id, names } = parsed.data;

  const { data: existing, error } = await db()
    .from('students')
    .select('full_name')
    .eq('group_id', group_id);
  if (error) throw new Error(error.message);
  const present = new Set(existing.map((s) => s.full_name.toLowerCase()));
  const fresh = names.filter((n) => !present.has(n.toLowerCase()));

  const taken = await takenSlugs('students');
  const rows = fresh.map((full_name) => {
    const slug = uniqueSlug(slugify(full_name, 70) || 'student', taken);
    taken.push(slug);
    return { group_id, full_name, slug };
  });
  if (rows.length) {
    const { error: insError } = await db().from('students').insert(rows);
    if (insError) throw new Error(insError.message);
  }

  await audit({
    actor: 'teacher',
    action: 'student.import',
    entity: 'group',
    entityId: group_id,
    meta: { added: rows.length, skipped: names.length - rows.length },
  });
  revalidatePath(`/admin/groups/${group_id}`);
  const skipped = names.length - rows.length;
  return {
    ok: `Добавлено: ${rows.length}${skipped ? `, пропущено (уже в группе): ${skipped}` : ''}.`,
  };
}

export async function saveStudent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(studentSchema, fd);
  if (!parsed.ok) return parsed.state;
  const id = idSchema.parse(fd.get('id'));
  const slug =
    parsed.data.slug ??
    uniqueSlug(slugify(parsed.data.full_name, 70) || 'student', await takenSlugs('students', id));
  const { error } = await db()
    .from('students')
    .update({ ...parsed.data, slug })
    .eq('id', id);
  if (error)
    return uniqueViolation(
      error,
      'Такой студент уже есть в группе или адрес занят.',
      parsed.values,
    );
  await audit({ actor: 'teacher', action: 'student.update', entity: 'student', entityId: id });
  revalidatePath(`/admin/groups/${parsed.data.group_id}`);
  redirect(`/admin/groups/${parsed.data.group_id}`);
}

/** Clears the PIN and bumps pin_version, which also strips the identity from every live session. */
export async function resetPin(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { data: s, error } = await db()
    .from('students')
    .select('group_id, pin_version')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  const { error: updError } = await db()
    .from('students')
    .update({
      pin_hash: null,
      pin_failed_count: 0,
      pin_locked_until: null,
      pin_version: s.pin_version + 1,
    })
    .eq('id', id);
  if (updError) throw new Error(updError.message);
  await audit({ actor: 'teacher', action: 'student.pin_reset', entity: 'student', entityId: id });
  revalidatePath(`/admin/groups/${s.group_id}`);
}

export async function toggleSubmissions(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const blocked = fd.get('blocked') === 'true';
  const { data, error } = await db()
    .from('students')
    .update({ submissions_blocked: blocked })
    .eq('id', id)
    .select('group_id')
    .single();
  if (error) throw new Error(error.message);
  await audit({
    actor: 'teacher',
    action: blocked ? 'student.block' : 'student.unblock',
    entity: 'student',
    entityId: id,
  });
  revalidatePath(`/admin/groups/${data.group_id}`);
}

export async function deleteStudent(fd: FormData): Promise<void> {
  await requireTeacher();
  const id = idSchema.parse(fd.get('id'));
  const { data, error } = await db()
    .from('students')
    .delete()
    .eq('id', id)
    .select('group_id')
    .single();
  if (error) throw new Error(error.message);
  await audit({ actor: 'teacher', action: 'student.delete', entity: 'student', entityId: id });
  revalidatePath(`/admin/groups/${data.group_id}`);
  redirect(`/admin/groups/${data.group_id}`);
}
