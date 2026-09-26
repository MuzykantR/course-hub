import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/db/types.gen';

loadEnvConfig(process.cwd());

export const E2E = {
  groupSlug: 'e2e-group',
  groupName: 'E2E группа',
  studentA: 'Тестова Алиса',
  studentB: 'Тестов Борис',
  lessonTitle: 'E2E занятие',
  taskTitle: 'E2E: сумма двух чисел',
  pin: '7391',
};

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (.env.local)');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export function passwords() {
  const course = process.env.DEV_COURSE_PASSWORD;
  const teacher = process.env.DEV_TEACHER_PASSWORD;
  if (!course || !teacher)
    throw new Error('DEV_COURSE_PASSWORD / DEV_TEACHER_PASSWORD missing (.env.local)');
  return { course, teacher };
}

/** Rate-limit rows from localhost: login/submit/pin-setup counters would otherwise leak between tests. */
export async function resetRateLimits() {
  const { error } = await db().from('rate_events').delete().gte('id', 0);
  if (error) throw new Error(error.message);
}

export async function removeE2EData() {
  const c = db();
  const { data: group } = await c
    .from('groups')
    .select('id')
    .eq('slug', E2E.groupSlug)
    .maybeSingle();
  const { data: lessons } = await c.from('lessons').select('id').eq('title', E2E.lessonTitle);
  // Lessons cascade to tasks → solutions; students cascade to their solutions/authorship.
  if (lessons?.length)
    await c
      .from('lessons')
      .delete()
      .in(
        'id',
        lessons.map((l) => l.id),
      );
  if (group) {
    await c.from('students').delete().eq('group_id', group.id);
    await c.from('groups').delete().eq('id', group.id);
  }
}

export async function taskId(): Promise<number> {
  const { data, error } = await db().from('tasks').select('id').eq('title', E2E.taskTitle).single();
  if (error) throw new Error(error.message);
  return data.id;
}
