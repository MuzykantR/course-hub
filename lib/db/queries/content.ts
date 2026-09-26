import 'server-only';
import { cache } from 'react';
import { db } from '../client';

// Everything here returns only published content: tasks that left draft, approved solutions,
// approved reports. Teacher-only views (drafts, pending) live in the admin queries.

type Res = { data: unknown; error: { message: string } | null };

/** List/aggregate queries: `data` is non-null whenever there is no error. */
function rows<R extends Res>(res: R, what: string): NonNullable<R['data']> {
  if (res.error || res.data === null)
    throw new Error(`${what}: ${res.error?.message ?? 'no data'}`);
  return res.data as NonNullable<R['data']>;
}

/** maybeSingle() queries: null means "not found". */
function maybe<R extends Res>(res: R, what: string): NonNullable<R['data']> | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? null) as NonNullable<R['data']> | null;
}

export type TaskStatus = 'draft' | 'assigned' | 'solved';

// ───────── lessons ─────────

export async function listLessons() {
  const lessons = rows(
    await db()
      .from('lessons')
      .select('id, date, number, title, lesson_groups(group_id), tasks(id, status)')
      .order('date', { ascending: false })
      .order('number', { ascending: false }),
    'lessons',
  );
  return lessons.map((l) => ({
    id: l.id,
    date: l.date,
    number: l.number,
    title: l.title,
    groupIds: l.lesson_groups.map((g) => g.group_id),
    taskCount: l.tasks.filter((t) => t.status !== 'draft').length,
  }));
}

export const getLesson = cache(async (id: number) => {
  const lesson = maybe(
    await db()
      .from('lessons')
      .select('id, date, number, title, description_md, lesson_groups(group_id)')
      .eq('id', id)
      .maybeSingle(),
    'lesson',
  );
  if (!lesson) return null;

  const tasks = rows(
    await db()
      .from('tasks')
      .select(
        'id, order, title, difficulty, tags, status, verdict, assigned_student_id, solutions(id, status)',
      )
      .eq('lesson_id', id)
      .neq('status', 'draft')
      .order('order'),
    'lesson tasks',
  );
  const reports = rows(
    await db()
      .from('reports')
      .select('slug, title, library')
      .eq('lesson_id', id)
      .eq('status', 'approved')
      .order('title'),
    'lesson reports',
  );

  return {
    ...lesson,
    groupIds: lesson.lesson_groups.map((g) => g.group_id),
    tasks: tasks.map((t) => ({
      ...t,
      solutionCount: t.solutions.filter((s) => s.status === 'approved').length,
    })),
    reports,
  };
});

export async function getLatestLesson() {
  return maybe(
    await db()
      .from('lessons')
      .select('id, date, number, title')
      .order('date', { ascending: false })
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'latest lesson',
  );
}

// ───────── tasks ─────────

export const getTask = cache(async (id: number) => {
  const task = maybe(
    await db()
      .from('tasks')
      .select(
        'id, order, title, statement_md, difficulty, tags, status, verdict, runtime_ms, memory_mb, assigned_student_id, lesson:lessons(id, date, number, title)',
      )
      .eq('id', id)
      .neq('status', 'draft')
      .maybeSingle(),
    'task',
  );
  if (!task) return null;

  const solutions = rows(
    await db()
      .from('solutions')
      .select('id, code, explanation_md, is_featured, author_student_id, created_at')
      .eq('task_id', id)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at'),
    'task solutions',
  );
  return { ...task, solutions };
});

// ───────── reports ─────────

export const getReport = cache(async (slug: string) => {
  const report = maybe(
    await db()
      .from('reports')
      .select(
        'id, slug, title, library, summary, content_md, tags, group_id, created_at, lesson:lessons(id, date, number, title), report_authors(student_id)',
      )
      .eq('slug', slug)
      .eq('status', 'approved')
      .maybeSingle(),
    'report',
  );
  if (!report) return null;
  return { ...report, authorIds: report.report_authors.map((a) => a.student_id) };
});

// ───────── people pages ─────────

export async function getStudentContributions(studentId: number) {
  const [assigned, solutions, reports] = await Promise.all([
    db()
      .from('tasks')
      .select('id, title, verdict, status, lesson:lessons(date)')
      .eq('assigned_student_id', studentId)
      .neq('status', 'draft')
      .order('created_at', { ascending: false }),
    db()
      .from('solutions')
      .select('id, is_featured, created_at, task:tasks!inner(id, title, status)')
      .eq('author_student_id', studentId)
      .eq('status', 'approved')
      .neq('task.status', 'draft')
      .order('created_at', { ascending: false }),
    db()
      .from('report_authors')
      .select('report:reports!inner(slug, title, library, status, created_at)')
      .eq('student_id', studentId)
      .eq('report.status', 'approved'),
  ]);
  return {
    assigned: rows(assigned, 'student tasks'),
    solutions: rows(solutions, 'student solutions'),
    reports: rows(reports, 'student reports').map((r) => r.report),
  };
}

/** Published contributions per student id. */
export async function getContributionCounts() {
  const [assigned, solutions, authors] = await Promise.all([
    db()
      .from('tasks')
      .select('assigned_student_id')
      .neq('status', 'draft')
      .not('assigned_student_id', 'is', null),
    db()
      .from('solutions')
      .select('author_student_id, task:tasks!inner(status)')
      .eq('status', 'approved')
      .neq('task.status', 'draft'),
    db()
      .from('report_authors')
      .select('student_id, report:reports!inner(status)')
      .eq('report.status', 'approved'),
  ]);
  const counts = new Map<number, { tasks: number; solutions: number; reports: number }>();
  const bump = (id: number | null, key: 'tasks' | 'solutions' | 'reports') => {
    if (id === null) return;
    const c = counts.get(id) ?? { tasks: 0, solutions: 0, reports: 0 };
    c[key] += 1;
    counts.set(id, c);
  };
  rows(assigned, 'counts tasks').forEach((r) => bump(r.assigned_student_id, 'tasks'));
  rows(solutions, 'counts solutions').forEach((r) => bump(r.author_student_id, 'solutions'));
  rows(authors, 'counts reports').forEach((r) => bump(r.student_id, 'reports'));
  return counts;
}

// ───────── home ─────────

export async function getHomeData() {
  const count = (
    res: { count: number | null; error: { message: string } | null },
    what: string,
  ) => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    return res.count ?? 0;
  };
  const [tasks, solutions, reports, lessons, recentSolutions, recentReports, latestLesson] =
    await Promise.all([
      db().from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'draft'),
      db()
        .from('solutions')
        .select('id, task:tasks!inner(status)', { count: 'exact', head: true })
        .eq('status', 'approved')
        .neq('task.status', 'draft'),
      db().from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      db().from('lessons').select('id', { count: 'exact', head: true }),
      db()
        .from('solutions')
        .select(
          'id, is_featured, author_student_id, reviewed_at, created_at, task:tasks!inner(id, title, status)',
        )
        .eq('status', 'approved')
        .neq('task.status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5),
      db()
        .from('reports')
        .select('slug, title, library, created_at, report_authors(student_id)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5),
      getLatestLesson(),
    ]);
  return {
    counts: {
      lessons: count(lessons, 'lessons count'),
      tasks: count(tasks, 'tasks count'),
      solutions: count(solutions, 'solutions count'),
      reports: count(reports, 'reports count'),
    },
    recentSolutions: rows(recentSolutions, 'recent solutions'),
    recentReports: rows(recentReports, 'recent reports').map((r) => ({
      ...r,
      authorIds: r.report_authors.map((a) => a.student_id),
    })),
    latestLesson,
  };
}
