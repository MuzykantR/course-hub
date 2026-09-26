type Res = { data: unknown; error: { message: string } | null };

/** List/aggregate queries: `data` is non-null whenever there is no error. */
export function rows<R extends Res>(res: R, what: string): NonNullable<R['data']> {
  if (res.error || res.data === null)
    throw new Error(`${what}: ${res.error?.message ?? 'no data'}`);
  return res.data as NonNullable<R['data']>;
}

/** maybeSingle() queries: null means "not found". */
export function maybe<R extends Res>(res: R, what: string): NonNullable<R['data']> | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? null) as NonNullable<R['data']> | null;
}
