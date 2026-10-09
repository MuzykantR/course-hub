import 'server-only';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SESSION_SECRET: z.string().min(32),
  TEACHER_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$/, 'must be a bcrypt hash'),
  // GitHub export is optional: without these the feature reports "not configured".
  GITHUB_EXPORT_TOKEN: z.string().min(20).optional(),
  GITHUB_EXPORT_REPO: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo')
    .optional(),
  GITHUB_EXPORT_BRANCH: z
    .string()
    .regex(/^[\w./-]+$/)
    .default('main'),
  // Secret in the UptimeRobot URL (`/api/health?token=…`): only such pings count toward SLO 1.
  HEALTH_CHECK_TOKEN: z.string().min(16).optional(),
});

let cached: z.infer<typeof schema> | undefined;

// Parsed lazily so `next build` doesn't need secrets for pages that never touch them.
export function env() {
  // Empty strings from .env templates count as "not set".
  cached ??= schema.parse(
    Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')),
  );
  return cached;
}
