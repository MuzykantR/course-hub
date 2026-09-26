// Edge-safe JWT helpers (used by middleware and by the server session layer).
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

export const SESSION_COOKIE = 'hse_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export const sessionSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('student'),
    pwdVersion: z.number().int().positive(),
    // Set together after a PIN check; pinVersion must match students.pin_version.
    studentId: z.number().int().positive().optional(),
    pinVersion: z.number().int().nonnegative().optional(),
  }),
  z.object({ role: z.literal('teacher') }),
]);

export type Session = z.infer<typeof sessionSchema>;

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session, secret: string): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    const parsed = sessionSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
