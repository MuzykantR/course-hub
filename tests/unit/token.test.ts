import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/token';

const SECRET = 'x'.repeat(40);

describe('session token', () => {
  it('round-trips a student session', async () => {
    const token = await signSession({ role: 'student', pwdVersion: 3, studentId: 7 }, SECRET);
    expect(await verifySession(token, SECRET)).toEqual({
      role: 'student',
      pwdVersion: 3,
      studentId: 7,
    });
  });

  it('round-trips a teacher session', async () => {
    const token = await signSession({ role: 'teacher' }, SECRET);
    expect(await verifySession(token, SECRET)).toEqual({ role: 'teacher' });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession({ role: 'teacher' }, 'y'.repeat(40));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signSession({ role: 'student', pwdVersion: 1 }, SECRET);
    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ role: 'teacher' })).toString('base64url');
    expect(await verifySession(`${h}.${forged}.${s}`, SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ role: 'teacher' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('rejects a validly signed but malformed payload', async () => {
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('returns null for a missing cookie', async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
  });
});
