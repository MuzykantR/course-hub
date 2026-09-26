import 'server-only';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SESSION_SECRET: z.string().min(32),
  TEACHER_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$/, 'must be a bcrypt hash'),
});

let cached: z.infer<typeof schema> | undefined;

// Parsed lazily so `next build` doesn't need secrets for pages that never touch them.
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
