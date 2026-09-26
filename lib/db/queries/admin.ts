import 'server-only';
import { db } from '../client';
import { maybe, rows } from '../result';

// Teacher-only reads: unlike lib/db/queries/content.ts these include drafts, pending and
// rejected content. Every page using them must call requireTeacher() first.

// ───────── lessons ─────────

export async function adminLessons() {
  const data = rows(
    await db()
      .from('lessons')
      .select('id, date, number, title, lesson_groups(group_id), tasks(id)')
      .order('date', { ascending: false })
      .order('number', { ascending: false }),
    'admin lessons',
  );
  return data.map((l) => ({
    ...l,
    groupIds: l.lesson_groups.map((g) => g.group_id),
    taskCount: l.tasks.length,
  }));
}

export async function adminLesson(id: number) {
  const lesson = maybe(
    await db()
      .from('lessons')
      .select('id, date, number, title, description_md, lesson_groups(group_id)')
      .eq('id', id)
      .maybeSingle(),
    'admin lesson',
  );
  if (!lesson) return null;
  const tasks = rows(
    await db()
      .from('tasks')
      .select('id, order, title, status, verdict, assigned_student_id')
      .eq('lesson_id', id)
      .order('order'),
    'admin lesson tasks',
  );
  return { ...lesson, groupIds: lesson.lesson_groups.map((g) => g.group_id), tasks };
}

export async function nextLessonNumber(): Promise<number> {
  const last = maybe(
    await db()
      .from('lessons')
      .select('number')
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'next lesson number',
  );
  return (last?.number ?? 0) + 1;
}

/** Lesson options for selects, newest first. */
export async function lessonOptions() {
  return rows(
    await db()
      .from('lessons')
      .select('id, number, title, date')
      .order('date', { ascending: false })
      .order('number', { ascending: false }),
    'lesson options',
  );
}

// ───────── tasks ─────────

export async function adminTasks(filters: { lessonId?: number; status?: string }) {
  let q = db()
    .from('tasks')
    .select(
      'id, order, title, status, verdict, difficulty, assigned_student_id, lesson:lessons!inner(id, number, date, title), solutions(id, status)',
    )
    .order('date', { referencedTable: 'lessons', ascending: false })
    .order('order');
  if (filters.lessonId) q = q.eq('lesson_id', filters.lessonId);
  if (filters.status) q = q.eq('status', filters.status);
  const data = rows(await q, 'admin tasks');
  return data
    .map((t) => ({
      ...t,
      pending: t.solutions.filter((s) => s.status === 'pending').length,
      approved: t.solutions.filter((s) => s.status === 'approved').length,
    }))
    .sort((a, b) => b.lesson.date.localeCompare(a.lesson.date) || a.order - b.order);
}

export async function adminTask(id: number) {
  return maybe(
    await db()
      .from('tasks')
      .select(
        'id, lesson_id, order, title, statement_md, difficulty, tags, assigned_student_id, status, verdict, runtime_ms, memory_mb, tests',
      )
      .eq('id', id)
      .maybeSingle(),
    'admin task',
  );
}

export async function nextTaskOrder(lessonId: number): Promise<number> {
  const last = maybe(
    await db()
      .from('tasks')
      .select('order')
      .eq('lesson_id', lessonId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'next task order',
  );
  return (last?.order ?? 0) + 1;
}

export async function taskOptions() {
  const data = rows(
    await db()
      .from('tasks')
      .select('id, order, title, lesson:lessons!inner(number, date)')
      .order('id', { ascending: false }),
    'task options',
  );
  return data.sort((a, b) => b.lesson.date.localeCompare(a.lesson.date) || a.order - b.order);
}

// ───────── solutions ─────────

export async function adminSolutions(filters: { taskId?: number; status?: string }) {
  let q = db()
    .from('solutions')
    .select('id, status, is_featured, created_at, author_student_id, task:tasks!inner(id, title)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.taskId) q = q.eq('task_id', filters.taskId);
  if (filters.status) q = q.eq('status', filters.status);
  return rows(await q, 'admin solutions');
}

export async function adminSolution(id: number) {
  return maybe(
    await db()
      .from('solutions')
      .select(
        'id, task_id, author_student_id, code, explanation_md, is_featured, status, review_comment, created_at, reviewed_at',
      )
      .eq('id', id)
      .maybeSingle(),
    'admin solution',
  );
}

// ───────── reports ─────────

export async function adminReports(filters: { status?: string }) {
  let q = db()
    .from('reports')
    .select('id, slug, title, library, status, group_id, created_at, report_authors(student_id)')
    .order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  return rows(await q, 'admin reports').map((r) => ({
    ...r,
    authorIds: r.report_authors.map((a) => a.student_id),
  }));
}

export async function adminReport(id: number) {
  const report = maybe(
    await db()
      .from('reports')
      .select(
        'id, slug, title, library, summary, content_md, group_id, lesson_id, tags, status, review_comment, report_authors(student_id), report_assets(id, path, mime, size)',
      )
      .eq('id', id)
      .maybeSingle(),
    'admin report',
  );
  if (!report) return null;
  return {
    ...report,
    authorIds: report.report_authors.map((a) => a.student_id),
    assets: [...report.report_assets].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

// ───────── people ─────────

export async function adminGroupStudents(groupId: number) {
  return rows(
    await db()
      .from('students')
      .select('id, full_name, slug, pin_hash, pin_locked_until, submissions_blocked')
      .eq('group_id', groupId)
      .order('full_name'),
    'admin students',
  ).map(({ pin_hash, ...s }) => ({ ...s, hasPin: pin_hash !== null }));
}

export async function adminStudent(id: number) {
  const s = maybe(
    await db()
      .from('students')
      .select('id, full_name, slug, group_id, pin_hash, pin_locked_until, submissions_blocked')
      .eq('id', id)
      .maybeSingle(),
    'admin student',
  );
  if (!s) return null;
  const { pin_hash, ...rest } = s;
  return { ...rest, hasPin: pin_hash !== null };
}

/** Matrix for the group overview: every task of the group's lessons × every student. */
export async function groupOverview(groupId: number) {
  const lessons = rows(
    await db()
      .from('lesson_groups')
      .select(
        'lesson:lessons!inner(id, number, date, title, tasks(id, order, title, status, verdict, assigned_student_id))',
      )
      .eq('group_id', groupId),
    'overview lessons',
  )
    .map((r) => r.lesson)
    .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);

  const taskIds = lessons.flatMap((l) => l.tasks.map((t) => t.id));
  const solutions = taskIds.length
    ? rows(
        await db()
          .from('solutions')
          .select('task_id, author_student_id, status')
          .in('task_id', taskIds)
          .neq('status', 'rejected'),
        'overview solutions',
      )
    : [];
  const reports = rows(
    await db()
      .from('report_authors')
      .select('student_id, report:reports!inner(status, group_id)')
      .eq('report.group_id', groupId)
      .eq('report.status', 'approved'),
    'overview reports',
  );
  return { lessons, solutions, reports };
}

// ───────── dashboard ─────────

export async function dashboardCounts() {
  const head = { count: 'exact' as const, head: true };
  const [pendingSolutions, pendingReports, drafts, students] = await Promise.all([
    db().from('solutions').select('id', head).eq('status', 'pending'),
    db().from('reports').select('id', head).eq('status', 'pending'),
    db().from('tasks').select('id', head).eq('status', 'draft'),
    db().from('students').select('id', head),
  ]);
  for (const r of [pendingSolutions, pendingReports, drafts, students]) {
    // HEAD requests carry no error body, so include status/code to keep failures diagnosable.
    if (r.error)
      throw new Error(
        `dashboard: ${r.error.message || r.error.code || 'request failed'} (HTTP ${r.status})`,
      );
  }
  return {
    pendingSolutions: pendingSolutions.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
    drafts: drafts.count ?? 0,
    students: students.count ?? 0,
  };
}

// ───────── moderation ─────────

/** Everything waiting for review, oldest first (fair queue). */
export async function moderationQueue() {
  const [solutions, reports] = await Promise.all([
    db()
      .from('solutions')
      .select(
        'id, code, explanation_md, created_at, author_student_id, task:tasks!inner(id, title, lesson:lessons!inner(number))',
      )
      .eq('status', 'pending')
      .order('created_at'),
    db()
      .from('reports')
      .select(
        'id, title, library, summary, content_md, tags, group_id, created_at, report_authors(student_id)',
      )
      .eq('status', 'pending')
      .order('created_at'),
  ]);
  return {
    solutions: rows(solutions, 'moderation solutions'),
    reports: rows(reports, 'moderation reports').map((r) => ({
      ...r,
      authorIds: r.report_authors.map((a) => a.student_id),
    })),
  };
}
