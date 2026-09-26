import { db, E2E, removeE2EData, resetRateLimits } from './db';

export default async function globalSetup() {
  await removeE2EData(); // leftovers from an interrupted run
  await resetRateLimits();
  const c = db();

  const { data: group, error: gErr } = await c
    .from('groups')
    .insert({ name: E2E.groupName, slug: E2E.groupSlug })
    .select('id')
    .single();
  if (gErr) throw new Error(gErr.message);

  const { error: sErr } = await c.from('students').insert([
    { group_id: group.id, full_name: E2E.studentA, slug: 'e2e-alisa' },
    { group_id: group.id, full_name: E2E.studentB, slug: 'e2e-boris' },
  ]);
  if (sErr) throw new Error(sErr.message);

  const { data: lesson, error: lErr } = await c
    .from('lessons')
    .insert({ date: '2026-09-25', number: 99, title: E2E.lessonTitle })
    .select('id')
    .single();
  if (lErr) throw new Error(lErr.message);
  await c.from('lesson_groups').insert({ lesson_id: lesson.id, group_id: group.id });

  const { error: tErr } = await c.from('tasks').insert({
    lesson_id: lesson.id,
    order: 1,
    title: E2E.taskTitle,
    statement_md: 'Напишите `add(a, b)`.',
    status: 'assigned',
    tags: ['e2e'],
    tests: [{ type: 'assert', name: 'сложение', code: 'assert add(2, 3) == 5' }],
  });
  if (tErr) throw new Error(tErr.message);
}
