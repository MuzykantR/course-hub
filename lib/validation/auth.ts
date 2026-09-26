import { z } from 'zod';

export const loginSchema = z.object({
  password: z.string().min(1, 'Введите пароль').max(200),
  next: z.string().optional(),
});

export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN — от 4 до 6 цифр');

export const identifySchema = z.object({
  studentId: z.coerce.number().int().positive('Выберите себя в списке'),
  pin: pinSchema,
  // Only sent when the student sets a PIN for the first time.
  pinConfirm: z.string().optional(),
});

/** Only same-site absolute paths survive; anything else falls back to "/". */
export function safeNextPath(next: string | undefined | null): string {
  // Browsers drop tabs/newlines and treat "\" as "/", so "/\t/evil.com" would become
  // "//evil.com". Legit values come URL-encoded and contain neither whitespace nor backslashes.
  if (!next || !/^\/(?![/\\])[^\s\\]*$/.test(next)) return '/';
  return next;
}
