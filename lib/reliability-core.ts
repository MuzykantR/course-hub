// Pure SLI/SLO math for the «Надёжность» page (unit-tested). DB reads live in lib/reliability.ts.

export const WINDOW_DAYS = 28;
export const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;
/** The external pinger (UptimeRobot) checks /api/health every 5 minutes. */
export const HEALTH_INTERVAL_MS = 5 * 60 * 1000;
export const PAGE_FAST_MS = 1500;
export const SEARCH_FAST_MS = 1000;
export const MODERATION_MS = 72 * 60 * 60 * 1000;
/** Fewer events than this: show «мало данных» instead of a status. */
export const MIN_EVENTS = 20;
/** Budget spent at or above this share puts the SLO «под угрозой». */
export const AT_RISK_SPENT = 0.5;

export type SloStatus = 'ok' | 'at-risk' | 'violated' | 'no-data';

export type SloResult = {
  good: number;
  total: number;
  bad: number;
  target: number;
  /** good / total, or null without events. */
  sli: number | null;
  /** Allowed bad events in the window: (1 − target) × total. */
  budget: number;
  /** Share of the budget already spent (bad / budget); may exceed 1. */
  spent: number;
  status: SloStatus;
  /** Too few events for the status to mean anything. */
  fewEvents: boolean;
};

export function evaluateSlo(good: number, total: number, target: number): SloResult {
  const safeTotal = Math.max(0, total);
  const safeGood = Math.min(Math.max(0, good), safeTotal);
  const bad = safeTotal - safeGood;
  const sli = safeTotal > 0 ? safeGood / safeTotal : null;
  const budget = (1 - target) * safeTotal;
  const spent = budget > 0 ? bad / budget : bad > 0 ? Infinity : 0;
  let status: SloStatus;
  if (sli === null) status = 'no-data';
  else if (sli < target) status = 'violated';
  else if (spent >= AT_RISK_SPENT) status = 'at-risk';
  else status = 'ok';
  return {
    good: safeGood,
    total: safeTotal,
    bad,
    target,
    sli,
    budget,
    spent,
    status,
    fewEvents: safeTotal < MIN_EVENTS,
  };
}

/** Start of the window, but not earlier than the first measurement. */
export function windowStart(now: number, firstMeasurement: number | null): number | null {
  if (firstMeasurement === null) return null;
  return Math.max(now - WINDOW_MS, firstMeasurement);
}

/**
 * Health SLI: every 5-minute interval since measurements began should contain one successful
 * check. Missing intervals mean the site (or its database) did not answer.
 */
export function healthSlo(
  checksInWindow: number,
  firstCheck: number | null,
  now: number,
  target: number,
): SloResult {
  const start = windowStart(now, firstCheck);
  if (start === null) return evaluateSlo(0, 0, target);
  const expected = Math.floor((now - start) / HEALTH_INTERVAL_MS) + 1;
  return evaluateSlo(Math.min(checksInWindow, expected), expected, target);
}

export type Submission = { createdAt: number; reviewedAt: number | null; pending: boolean };

/**
 * Moderation SLI: a submission is good when reviewed within 72 h, bad when reviewed later or
 * still pending after 72 h; younger pending submissions are not counted yet.
 */
export function moderationCounts(
  submissions: Submission[],
  now: number,
): { good: number; total: number } {
  let good = 0;
  let total = 0;
  for (const s of submissions) {
    if (s.pending || s.reviewedAt === null) {
      if (now - s.createdAt > MODERATION_MS) total++;
      continue;
    }
    total++;
    if (s.reviewedAt - s.createdAt <= MODERATION_MS) good++;
  }
  return { good, total };
}

const pct = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** 0.99712 → «99,71%». Rounds down so a value just under the target never reads as the target. */
export function formatPercent(share: number): string {
  return `${pct.format(Math.floor(share * 10000) / 100)}%`;
}

export function formatCount(n: number): string {
  return num.format(n);
}

/** «осталось 62% бюджета (потрачено 15 из 40)». */
export function describeBudget(r: SloResult): string {
  if (r.total === 0) return 'бюджет появится с первыми замерами';
  const left = Number.isFinite(r.spent) ? Math.max(0, 1 - r.spent) : 0;
  return `осталось ${pct.format(Math.round(left * 100))}% бюджета (потрачено ${formatCount(r.bad)} из ${formatCount(r.budget)})`;
}

/** Pages whose renders feed SLO 2–4 (route templates, never concrete ids). */
export const KEY_ROUTES = ['/', '/kb', '/lessons/[id]', '/tasks/[id]', '/reports/[slug]'] as const;
export type KeyRoute = (typeof KEY_ROUTES)[number];
export type MetricKind = 'page' | 'search';

/** `/kb` with a non-empty `q` is a search; everything else is a page view. */
export function metricKind(route: KeyRoute, q: string | undefined | null): MetricKind {
  return route === '/kb' && q?.trim() ? 'search' : 'page';
}

/**
 * Next's error context reports the app path with route groups (`/(site)/tasks/[id]`); map it to
 * a key route, or null for routes the SLOs don't cover.
 */
export function keyRouteOf(routePath: string): KeyRoute | null {
  const clean = `/${routePath
    .split('/')
    .filter((s) => s && !/^\(.*\)$/.test(s) && s !== 'page')
    .join('/')}`;
  return (KEY_ROUTES as readonly string[]).includes(clean) ? (clean as KeyRoute) : null;
}
