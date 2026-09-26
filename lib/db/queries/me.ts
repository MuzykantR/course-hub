import 'server-only';
import { db } from '../client';
import { maybe, rows } from '../result';

// The current student's own submissions, in every status (including rejected with comments).
// Callers pass the id from requireIdentifiedStudent() — never from user input.

export async function mySubmissions(studentId: number) {
  const [solutions, reports] = await Promise.all([
    db()
      .from('solutions')
      .select(
        'id, status, review_comment, created_at, reviewed_at, task:tasks!inner(id, title, status)',
      )
      .eq('author_student_id', studentId)
      .order('created_at', { ascending: false }),
    db()
      .from('report_authors')
      .select(
        'report:reports!inner(id, slug, title, library, status, review_comment, created_at, reviewed_at)',
      )
      .eq('student_id', studentId),
  ]);
  return {
    solutions: rows(solutions, 'my solutions'),
    reports: rows(reports, 'my reports')
      .map((r) => r.report)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** A report the student co-authors, with its images — for the "add images" page. */
export async function myReport(studentId: number, reportId: number) {
  const link = maybe(
    await db()
      .from('report_authors')
      .select(
        'report:reports!inner(id, slug, title, library, status, content_md, review_comment, report_assets(id, path, mime, size))',
      )
      .eq('student_id', studentId)
      .eq('report_id', reportId)
      .maybeSingle(),
    'my report',
  );
  if (!link) return null;
  const { report_assets, ...report } = link.report;
  return { ...report, assets: [...report_assets].sort((a, b) => a.path.localeCompare(b.path)) };
}
