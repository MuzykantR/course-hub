import { describe, expect, it } from 'vitest';
import { createLimiter, RATE_RULES, type RateStore } from '@/lib/ratelimit-core';

function memoryStore(): RateStore & { size(): number } {
  let nextId = 1;
  const events = new Map<number, { key: string; at: Date }>();
  return {
    async count(key, since) {
      return [...events.values()].filter((e) => e.key === key && e.at >= since).length;
    },
    async add(key, at) {
      const id = nextId++;
      events.set(id, { key, at });
      return id;
    },
    async remove(id) {
      events.delete(id);
    },
    size: () => events.size,
  };
}

describe('rate limiter', () => {
  it('allows max reservations inside the window and frees up after it', async () => {
    let now = new Date('2026-01-01T12:00:00Z');
    const limiter = createLimiter(memoryStore(), () => now);
    const rule = RATE_RULES.login;

    for (let i = 0; i < rule.max; i++) {
      expect((await limiter.reserve('login:ip', rule)).allowed).toBe(true);
    }
    expect((await limiter.reserve('login:ip', rule)).allowed).toBe(false);

    now = new Date(now.getTime() + rule.windowMs + 1);
    expect((await limiter.reserve('login:ip', rule)).allowed).toBe(true);
  });

  it('holds the cap under concurrent requests', async () => {
    const limiter = createLimiter(memoryStore());
    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.reserve('login:ip', RATE_RULES.login)),
    );
    expect(results.filter((r) => r.allowed).length).toBeLessThanOrEqual(RATE_RULES.login.max);
  });

  it('rejected reservations are not stored; released ones stop counting', async () => {
    const store = memoryStore();
    const limiter = createLimiter(store);
    const rule = { max: 1, windowMs: 60_000 };

    const first = await limiter.reserve('k', rule);
    expect((await limiter.reserve('k', rule)).allowed).toBe(false);
    expect(store.size()).toBe(1);

    await first.release();
    expect((await limiter.reserve('k', rule)).allowed).toBe(true);
  });

  it('keeps keys independent', async () => {
    const limiter = createLimiter(memoryStore());
    for (let i = 0; i < RATE_RULES.login.max; i++)
      await limiter.reserve('login:a', RATE_RULES.login);
    expect((await limiter.reserve('login:a', RATE_RULES.login)).allowed).toBe(false);
    expect((await limiter.reserve('login:b', RATE_RULES.login)).allowed).toBe(true);
  });
});
