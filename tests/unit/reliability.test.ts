import { describe, expect, it } from 'vitest';
import {
  HEALTH_INTERVAL_MS,
  MODERATION_MS,
  WINDOW_MS,
  describeBudget,
  evaluateSlo,
  formatPercent,
  healthSlo,
  moderationCounts,
} from '@/lib/reliability-core';

describe('evaluateSlo', () => {
  it('computes SLI, budget and spent share', () => {
    const r = evaluateSlo(985, 1000, 0.99);
    expect(r.sli).toBeCloseTo(0.985);
    expect(r.bad).toBe(15);
    expect(r.budget).toBeCloseTo(10);
    expect(r.spent).toBeCloseTo(1.5);
    expect(r.status).toBe('violated');
  });

  it('is at risk once half the budget is spent', () => {
    expect(evaluateSlo(994, 1000, 0.99).status).toBe('at-risk');
    expect(evaluateSlo(996, 1000, 0.99).status).toBe('ok');
  });

  it('reports no data and few events', () => {
    const empty = evaluateSlo(0, 0, 0.95);
    expect(empty.status).toBe('no-data');
    expect(empty.sli).toBeNull();
    expect(evaluateSlo(5, 5, 0.95).fewEvents).toBe(true);
    expect(evaluateSlo(20, 20, 0.95).fewEvents).toBe(false);
  });
});

describe('healthSlo', () => {
  const now = Date.UTC(2026, 9, 10, 12, 0);

  it('expects one check per 5 minutes since the first one', () => {
    const first = now - 60 * 60 * 1000; // 1 hour → 13 expected checks
    const r = healthSlo(12, first, now, 0.995);
    expect(r.total).toBe(13);
    expect(r.good).toBe(12);
  });

  it('caps the window at 28 days and never exceeds 100%', () => {
    const r = healthSlo(10_000, now - 2 * WINDOW_MS, now, 0.995);
    expect(r.total).toBe(Math.floor(WINDOW_MS / HEALTH_INTERVAL_MS) + 1);
    expect(r.sli).toBe(1);
  });

  it('has no data before the first check', () => {
    expect(healthSlo(0, null, now, 0.995).status).toBe('no-data');
  });
});

describe('moderationCounts', () => {
  const now = Date.UTC(2026, 9, 10);
  const h = 60 * 60 * 1000;

  it('counts reviews within 72 h as good and late or stale ones as bad', () => {
    const { good, total } = moderationCounts(
      [
        { createdAt: now - 100 * h, reviewedAt: now - 90 * h, pending: false }, // good
        { createdAt: now - 200 * h, reviewedAt: now - 100 * h, pending: false }, // late
        { createdAt: now - MODERATION_MS - h, reviewedAt: null, pending: true }, // stale
        { createdAt: now - 10 * h, reviewedAt: null, pending: true }, // not counted yet
      ],
      now,
    );
    expect(good).toBe(1);
    expect(total).toBe(3);
  });
});

describe('formatting', () => {
  it('rounds percentages down', () => {
    expect(formatPercent(0.99999)).toBe('99,99%');
    expect(formatPercent(0.997)).toBe('99,7%');
  });

  it('describes the budget', () => {
    expect(describeBudget(evaluateSlo(985, 1000, 0.98))).toBe(
      'осталось 25% бюджета (потрачено 15 из 20)',
    );
  });
});

describe('routes', () => {
  it('maps Next app paths to key routes', async () => {
    const { keyRouteOf, metricKind } = await import('@/lib/reliability-core');
    expect(keyRouteOf('/(site)/tasks/[id]')).toBe('/tasks/[id]');
    expect(keyRouteOf('/(site)/page')).toBe('/');
    expect(keyRouteOf('/(site)')).toBe('/');
    expect(keyRouteOf('/admin/tasks/[id]')).toBeNull();
    expect(metricKind('/kb', ' numpy ')).toBe('search');
    expect(metricKind('/kb', '')).toBe('page');
    expect(metricKind('/tasks/[id]', 'x')).toBe('page');
  });
});
