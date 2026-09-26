import 'server-only';
import { cache } from 'react';
import { db } from './client';

// One row (id = true). Cached per request: guards and pages read it repeatedly.
export const getSettings = cache(async () => {
  const { data, error } = await db().from('settings').select('*').eq('id', true).single();
  if (error) throw new Error(`settings: ${error.message}`);
  return data;
});
