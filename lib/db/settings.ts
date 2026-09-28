import 'server-only';
import { cache } from 'react';
import { db } from './client';

// One row (id = true). Cached per request: guards and pages read it repeatedly.
export const getSettings = cache(async () => {
  const { data, error } = await db().from('settings').select('*').eq('id', true).maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  // A fresh database (e.g. production) has no settings row until the course password is set.
  if (!data) throw new Error("settings row missing — run: npx tsx scripts/init-settings.ts '<course password>'");
  return data;
});
