import 'server-only';
import { cache } from 'react';
import { db } from '../client';
import { maybe, rows } from '../result';

// Everything here returns only published content: tasks that left draft, approved solutions,
// approved reports. Teacher-only views (drafts, pending) live in the admin queries.

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

export type StudentTask = {
  id: number;
  title: string;
  date: string | null;
  /** Verdict of the board attempt — only when the task was assigned to this student. */
  verdict: string | null;
  hasSolution: boolean;
};

/** A student's tasks: assigned to them and/or with their approved solution, newest first. */
export async function getStudentContributions(studentId: number) {
  const [assigned, solutions, reports] = await Promise.all([
    db()
      .from('tasks')
      .select('id, title, verdict, lesson:lessons(date)')
      .eq('assigned_student_id', studentId)
      .neq('status', 'draft'),
    db()
      .from('solutions')
      .select('task:tasks!inner(id, title, status, lesson:lessons(date))')
      .eq('author_student_id', studentId)
      .eq('status', 'approved')
      .neq('task.status', 'draft'),
    db()
      .from('report_authors')
      .select('report:reports!inner(slug, title, library, status, created_at)')
      .eq('student_id', studentId)
      .eq('report.status', 'approved'),
  ]);

  const tasks = new Map<number, StudentTask>();
  for (const t of rows(assigned, 'student tasks')) {
    tasks.set(t.id, {
      id: t.id,
      title: t.title,
      date: t.lesson?.date ?? null,
      verdict: t.verdict,
      hasSolution: false,
    });
  }
  for (const { task } of rows(solutions, 'student solutions')) {
    const existing = tasks.get(task.id);
    if (existing) existing.hasSolution = true;
    else
      tasks.set(task.id, {
        id: task.id,
        title: task.title,
        date: task.lesson?.date ?? null,
        verdict: null,
        hasSolution: true,
      });
  }

  return {
    tasks: [...tasks.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    reports: rows(reports, 'student reports').map((r) => r.report),
  };
}

/** Per student id: distinct tasks (assigned or solved) and approved reports. */
export async function getContributionCounts() {
  const [assigned, solutions, authors] = await Promise.all([
    db()
      .from('tasks')
      .select('id, assigned_student_id')
      .neq('status', 'draft')
      .not('assigned_student_id', 'is', null),
    db()
      .from('solutions')
      .select('task_id, author_student_id, task:tasks!inner(status)')
      .eq('status', 'approved')
      .neq('task.status', 'draft'),
    db()
      .from('report_authors')
      .select('student_id, report:reports!inner(status)')
      .eq('report.status', 'approved'),
  ]);

  const taskIds = new Map<number, Set<number>>();
  const addTask = (studentId: number, taskId: number) => {
    const set = taskIds.get(studentId) ?? new Set<number>();
    set.add(taskId);
    taskIds.set(studentId, set);
  };
  for (const t of rows(assigned, 'counts tasks')) addTask(t.assigned_student_id!, t.id);
  for (const s of rows(solutions, 'counts solutions')) addTask(s.author_student_id, s.task_id);

  const reportCounts = new Map<number, number>();
  for (const a of rows(authors, 'counts reports')) {
    reportCounts.set(a.student_id, (reportCounts.get(a.student_id) ?? 0) + 1);
  }

  return (studentId: number) => ({
    tasks: taskIds.get(studentId)?.size ?? 0,
    reports: reportCounts.get(studentId) ?? 0,
  });
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
