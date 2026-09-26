import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getSettings } from '@/lib/db/settings';
import { readSessionCookie } from './session';
import type { Session } from './token';

/**
 * The verified session, or null. Student sessions die when the course password changes
 * (settings.pwd_version is bumped), which the edge middleware can't check on its own.
 * A student identity survives only while the student's PIN hasn't been set/reset since.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await readSessionCookie();
  if (!session) return null;
  if (session.role === 'teacher') return session;

  const settings = await getSettings();
  if (session.pwdVersion !== settings.pwd_version) return null;

  if (session.studentId !== undefined) {
    const { data: student, error } = await db()
      .from('students')
      .select('pin_version')
      .eq('id', session.studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!student || student.pin_version !== session.pinVersion) {
      return { role: 'student', pwdVersion: session.pwdVersion };
    }
  }
  return session;
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireTeacher(): Promise<Extract<Session, { role: 'teacher' }>> {
  const session = await requireSession();
  if (session.role !== 'teacher') redirect('/');
  return session;
}

export async function requireStudent(): Promise<Extract<Session, { role: 'student' }>> {
  const session = await requireSession();
  if (session.role !== 'student') redirect('/');
  return session;
}

/**
 * A student who has confirmed who they are with their current PIN. Unidentified students go
 * to /me and come back to `returnTo` after entering the PIN.
 */
export async function requireIdentifiedStudent(returnTo?: string): Promise<
  Extract<Session, { role: 'student' }> & { studentId: number }
> {
  const session = await requireStudent();
  if (!session.studentId) redirect(returnTo ? `/me?next=${encodeURIComponent(returnTo)}` : '/me');
  return { ...session, studentId: session.studentId };
}
