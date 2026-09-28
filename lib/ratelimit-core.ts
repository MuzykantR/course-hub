// Storage-agnostic sliding-window limiter. The Postgres store lives in lib/ratelimit.ts;
// tests use an in-memory store.

export type RateRule = { max: number; windowMs: number };

export interface RateStore {
  count(key: string, since: Date): Promise<number>;
  /** Records an event and returns its id. */
  add(key: string, at: Date): Promise<number>;
  remove(id: number): Promise<void>;
}

export type Reservation = {
  allowed: boolean;
  /** Undo the reservation, e.g. after a successful login so it doesn't count as a failure. */
  release(): Promise<void>;
};

const MINUTE = 60_000;

export const RATE_RULES = {
  /** Wrong passwords per IP. */
  login: { max: 5, windowMs: 10 * MINUTE },
  /** PIN checks per IP across all students: stops brute-forcing many students in parallel. */
  pinCheckIp: { max: 30, windowMs: 60 * MINUTE },
  /** First-time PIN setups per IP: stops one person claiming the whole student list. */
  pinSetup: { max: 3, windowMs: 24 * 60 * MINUTE },
  /** Submissions per student per day. */
  submitStudent: { max: 10, windowMs: 24 * 60 * MINUTE },
  /** Submissions per IP per day. */
  submitIp: { max: 20, windowMs: 24 * 60 * MINUTE },
  /** Image uploads to one's own pending reports per student per day. */
  uploadStudent: { max: 30, windowMs: 24 * 60 * MINUTE },
  /** Minimum gap between two submissions of one student. */
  submitCooldown: { max: 1, windowMs: MINUTE },
} satisfies Record<string, RateRule>;

const noop = async () => {};

export function createLimiter(store: RateStore, now: () => Date = () => new Date()) {
  return {
    /**
     * Record first, then count (own event included). Concurrent requests therefore can't all
     * slip under the limit: whoever pushes the count past `max` is rejected and un-records.
     */
    async reserve(key: string, rule: RateRule): Promise<Reservation> {
      const at = now();
      const id = await store.add(key, at);
      const count = await store.count(key, new Date(at.getTime() - rule.windowMs));
      if (count > rule.max) {
        await store.remove(id);
        return { allowed: false, release: noop };
      }
      return { allowed: true, release: () => store.remove(id) };
    },
  };
}
