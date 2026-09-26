'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/audit';
import { runExport } from '@/lib/github/export';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { getSettings } from '@/lib/db/settings';
import { parseForm, type FormState } from '@/lib/forms';
import { passwordChangeSchema, settingsTogglesSchema } from '@/lib/validation/admin';

async function bumpPwdVersion(extra: { course_password_hash?: string } = {}) {
  const current = await getSettings();
  const { error } = await db()
    .from('settings')
    .update({
      ...extra,
      pwd_version: current.pwd_version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);
  if (error) throw new Error(error.message);
}

/** New course password; every student session dies (pwd_version is part of the JWT). */
export async function changeCoursePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(passwordChangeSchema, fd);
  // Never echo passwords back into the form.
  if (!parsed.ok) return { ...parsed.state, values: undefined };
  await bumpPwdVersion({ course_password_hash: await bcrypt.hash(parsed.data.password, 12) });
  await audit({ actor: 'teacher', action: 'settings.course_password', entity: 'settings' });
  revalidatePath('/admin/settings');
  return { ok: 'Пароль курса изменён. Все студенты должны войти заново с новым паролем.' };
}

export async function logoutAllStudents(): Promise<void> {
  await requireTeacher();
  await bumpPwdVersion();
  await audit({ actor: 'teacher', action: 'settings.logout_students', entity: 'settings' });
  revalidatePath('/admin/settings');
}

export async function saveToggles(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const parsed = parseForm(settingsTogglesSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { error } = await db()
    .from('settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw new Error(error.message);
  await audit({
    actor: 'teacher',
    action: 'settings.update',
    entity: 'settings',
    meta: parsed.data,
  });
  revalidatePath('/admin/settings');
  return { ok: 'Сохранено.' };
}

export async function exportNow(_prev: FormState, _fd: FormData): Promise<FormState> {
  await requireTeacher();
  const result = await runExport('вручную', true);
  await audit({
    actor: 'teacher',
    action: 'settings.github_export',
    entity: 'settings',
    meta: { ok: result.ok },
  });
  revalidatePath('/admin/settings');
  return result.ok ? { ok: result.message } : { error: result.message };
}
