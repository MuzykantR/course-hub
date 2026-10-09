import 'server-only';
import { after } from 'next/server';
import { db } from '@/lib/db/client';
import type { KeyRoute, MetricKind } from '@/lib/reliability-core';

type Metric = { kind: MetricKind; route: KeyRoute; duration_ms: number; ok: boolean };

/** Best-effort: a failed metric write is logged and never breaks the page. */
export async function insertMetric(m: Metric): Promise<void> {
  try {
    const { error } = await db().from('page_metrics').insert(m);
    if (error) console.error('page_metrics insert failed', error.message);
  } catch (e) {
    console.error('page_metrics insert failed', e);
  }
}

/**
 * Call at the end of a key page's server render with `performance.now()` taken at its start.
 * The row is written after the response is sent. Stores only the route template, the duration
 * and the outcome — no student, IP or query text. Errors are recorded by `instrumentation.ts`.
 */
export function recordPageView(route: KeyRoute, startedAt: number, kind: MetricKind = 'page') {
  const duration_ms = Math.max(0, Math.round(performance.now() - startedAt));
  try {
    after(() => insertMetric({ kind, route, duration_ms, ok: true }));
  } catch (e) {
    // Outside a request scope (e.g. a build-time render) there is nothing to measure.
    console.error('page metric skipped', e);
  }
}
