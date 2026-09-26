import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type Session,
} from './token';

export async function readSessionCookie(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, env().SESSION_SECRET);
}

export async function writeSessionCookie(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session, env().SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
