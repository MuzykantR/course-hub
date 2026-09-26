import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9-]{1,100}$/);

/** Knowledge-base filters live in the URL; anything malformed is ignored instead of failing. */
export const kbFiltersSchema = z.object({
  type: z.enum(['task', 'report']).optional().catch(undefined),
  group: slug.optional().catch(undefined),
  student: slug.optional().catch(undefined),
  tag: z.string().trim().min(1).max(50).optional().catch(undefined),
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  sort: z.enum(['new', 'old', 'title']).default('new').catch('new'),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});

export type KbFilters = z.infer<typeof kbFiltersSchema>;

/**
 * User text → to_tsquery('russian', …) string: every word becomes a stemmed prefix
 * ("массив:*"), words are AND-ed. The Russian stemmer is inconsistent across word forms
 * (массив → масс, массивы → массив), so prefixes are what make «массив» find «массивы».
 * Only letters/digits survive, so tsquery operators in the input can't be injected.
 */
export function toPrefixTsQuery(q: string): string | null {
  const words =
    q
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.slice(0, 8) ?? [];
  return words.length ? words.map((w) => `${w}:*`).join(' & ') : null;
}

type RawParams = Record<string, string | string[] | undefined>;

export function parseKbFilters(params: RawParams): KbFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return kbFiltersSchema.parse(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, first(v)])),
  );
}

/** URL for the KB with `patch` applied on top of `current`; resets paging unless `page` is set. */
export function kbHref(current: Partial<KbFilters>, patch: Partial<KbFilters>): string {
  const next: Partial<KbFilters> = { ...current, page: undefined, ...patch };
  const qs = new URLSearchParams();
  for (const key of ['q', 'type', 'group', 'student', 'tag', 'sort', 'page'] as const) {
    const v = next[key];
    if (v === undefined || (key === 'sort' && v === 'new') || (key === 'page' && v === 1)) continue;
    qs.set(key, String(v));
  }
  const s = qs.toString();
  return s ? `/kb?${s}` : '/kb';
}
