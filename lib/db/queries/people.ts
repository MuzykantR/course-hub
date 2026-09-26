import 'server-only';
import { cache } from 'react';
import { db } from '../client';

export type GroupRef = { id: number; name: string; slug: string };
export type StudentRef = { id: number; name: string; slug: string; groupId: number };

/** All groups and students (tens of rows) — loaded once per request and used for lookups. */
export const getPeople = cache(async () => {
  const [groups, students] = await Promise.all([
    db().from('groups').select('id, name, slug').order('name'),
    // Never select pin_* here: this feeds rendering.
    db().from('students').select('id, full_name, slug, group_id').order('full_name'),
  ]);
  if (groups.error) throw new Error(groups.error.message);
  if (students.error) throw new Error(students.error.message);

  const groupList: GroupRef[] = groups.data;
  const studentList: StudentRef[] = students.data.map((s) => ({
    id: s.id,
    name: s.full_name,
    slug: s.slug,
    groupId: s.group_id,
  }));
  return {
    groups: groupList,
    students: studentList,
    groupById: new Map(groupList.map((g) => [g.id, g])),
    groupBySlug: new Map(groupList.map((g) => [g.slug, g])),
    studentById: new Map(studentList.map((s) => [s.id, s])),
    studentBySlug: new Map(studentList.map((s) => [s.slug, s])),
  };
});

export type People = Awaited<ReturnType<typeof getPeople>>;
