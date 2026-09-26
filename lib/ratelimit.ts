import 'server-only';
import { db } from '@/lib/db/client';
import { createLimiter, type RateStore } from './ratelimit-core';

export { RATE_RULES } from './ratelimit-core';

const RETENTION_MS = 2 * 24 * 60 * 60_000;

const postgresStore: RateStore = {
  async count(key, since) {
    const { count, error } = await db()
      .from('rate_events')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', since.toISOString());
    if (error) throw new Error(`rate_events count: ${error.message}`);
    return count ?? 0;
  },
  async add(key, at) {
    const { data, error } = await db()
      .from('rate_events')
      .insert({ key, created_at: at.toISOString() })
      .select('id')
      .single();
    if (error) throw new Error(`rate_events insert: ${error.message}`);
    // Cheap housekeeping instead of a cron job: ~1% of writes prune old rows.
    if (Math.random() < 0.01) {
      await db()
        .from('rate_events')
        .delete()
        .lt('created_at', new Date(at.getTime() - RETENTION_MS).toISOString());
    }
    return data.id;
  },
  async remove(id) {
    const { error } = await db().from('rate_events').delete().eq('id', id);
    if (error) throw new Error(`rate_events delete: ${error.message}`);
  },
};

export const limiter = createLimiter(postgresStore);
