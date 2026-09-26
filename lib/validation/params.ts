import { notFound } from 'next/navigation';
import { z } from 'zod';

const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,17}$/)
  .transform(Number);
const slugSchema = z.string().regex(/^[a-z0-9-]{1,100}$/);

/** Route param → positive integer id, or a 404. */
export function parseIdParam(raw: string): number {
  const r = idSchema.safeParse(raw);
  if (!r.success || !Number.isSafeInteger(r.data)) notFound();
  return r.data;
}

/** Route param → slug, or a 404. */
export function parseSlugParam(raw: string): string {
  // Slugs are ASCII-only, so no decoding is needed (and a malformed %-escape just 404s).
  const r = slugSchema.safeParse(raw);
  if (!r.success) notFound();
  return r.data;
}
