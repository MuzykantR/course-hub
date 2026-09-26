'use server';

import { redirect } from 'next/navigation';
import { audit } from '@/lib/audit';
import { verifyPassword } from '@/lib/auth/passwords';
import { clearSessionCookie, writeSessionCookie } from '@/lib/auth/session';
import { getSettings } from '@/lib/db/settings';
import { env } from '@/lib/env';
import { limiter, RATE_RULES } from '@/lib/ratelimit';
import { clientIp } from '@/lib/request';
import { loginSchema, safeNextPath } from '@/lib/validation/auth';

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Неверный ввод' };

  const ip = await clientIp();
  // Every attempt reserves a slot up front; a successful login gives it back, so only
  // failures accumulate towards the limit.
  const attempt = await limiter.reserve(`login:${ip}`, RATE_RULES.login);
  if (!attempt.allowed) {
    return { error: 'Слишком много неверных попыток. Подождите 10 минут.' };
  }

  const { password } = parsed.data;
  const next = safeNextPath(parsed.data.next);

  if (await verifyPassword(password, env().TEACHER_PASSWORD_HASH)) {
    await attempt.release();
    await writeSessionCookie({ role: 'teacher' });
    await audit({ actor: 'teacher', action: 'login', entity: 'session', meta: { ip } });
    redirect(next === '/' ? '/admin' : next);
  }

  const settings = await getSettings();
  if (await verifyPassword(password, settings.course_password_hash)) {
    await attempt.release();
    await writeSessionCookie({ role: 'student', pwdVersion: settings.pwd_version });
    redirect(next.startsWith('/admin') ? '/' : next);
  }

  return { error: 'Неверный пароль' };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
