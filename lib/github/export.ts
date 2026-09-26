import 'server-only';
import { after } from 'next/server';
import { db } from '@/lib/db/client';
import { rows } from '@/lib/db/result';
import { env } from '@/lib/env';
import { REPORT_BUCKET } from '@/lib/reports';
import { commitTree } from './client';
import { buildExportFiles, type ExportInput } from './layout';

/** Everything published, in the shape layout.ts expects. Same visibility rules as the site. */
async function loadExportInput(): Promise<ExportInput> {
  const [groups, students, lessons, tasks, solutions, reports] = await Promise.all([
    db().from('groups').select('id, name'),
    db().from('students').select('id, full_name, slug'),
    db().from('lessons').select('id, date, number, title, description_md, lesson_groups(group_id)'),
    db()
      .from('tasks')
      .select(
        'id, lesson_id, order, title, statement_md, difficulty, tags, verdict, runtime_ms, memory_mb, assigned_student_id',
      )
      .neq('status', 'draft'),
    db()
      .from('solutions')
      .select(
        'task_id, author_student_id, code, explanation_md, is_featured, created_at, task:tasks!inner(status)',
      )
      .eq('status', 'approved')
      .neq('task.status', 'draft')
      .order('created_at'),
    db()
      .from('reports')
      .select(
        'id, slug, title, library, summary, content_md, lesson_id, group_id, tags, report_authors(student_id), report_assets(path)',
      )
      .eq('status', 'approved'),
  ]);

  const reportRows = rows(reports, 'export reports');
  const assets: ExportInput['assets'] = [];
  for (const r of reportRows) {
    for (const a of r.report_assets) {
      const { data, error } = await db().storage.from(REPORT_BUCKET).download(a.path);
      if (error || !data) throw new Error(`export: cannot read ${a.path}`);
      assets.push({
        report_id: r.id,
        name: a.path.split('/').pop()!,
        base64: Buffer.from(await data.arrayBuffer()).toString('base64'),
      });
    }
  }

  return {
    courseTitle: 'Python HSE Hub',
    groups: rows(groups, 'export groups'),
    students: rows(students, 'export students').map((s) => ({
      id: s.id,
      name: s.full_name,
      slug: s.slug,
    })),
    lessons: rows(lessons, 'export lessons').map(({ lesson_groups, ...l }) => ({
      ...l,
      groupIds: lesson_groups.map((g) => g.group_id),
    })),
    tasks: rows(tasks, 'export tasks'),
    solutions: rows(solutions, 'export solutions').map(({ task: _t, created_at: _c, ...s }) => s),
    reports: reportRows.map(({ report_authors, report_assets: _a, ...r }) => ({
      ...r,
      authorIds: report_authors.map((a) => a.student_id),
    })),
    assets,
  };
}

async function recordStatus(ok: boolean, message: string, commitUrl?: string | null) {
  await db()
    .from('settings')
    .update({
      github_last_export_at: new Date().toISOString(),
      github_last_export_ok: ok,
      github_last_export_message: message.slice(0, 2000),
      ...(commitUrl ? { github_last_commit_url: commitUrl } : {}),
    })
    .eq('id', true);
}

export function exportConfigured(): boolean {
  const e = env();
  return Boolean(e.GITHUB_EXPORT_TOKEN && e.GITHUB_EXPORT_REPO);
}

/**
 * Rebuild the export repository from the database. Never throws: the outcome is stored in
 * settings and shown on /admin/settings. `force` runs even when the toggle is off.
 */
export async function runExport(
  reason: string,
  force = false,
): Promise<{ ok: boolean; message: string }> {
  const { data: settings } = await db()
    .from('settings')
    .select('github_export_enabled')
    .eq('id', true)
    .single();
  if (!force && !settings?.github_export_enabled) return { ok: true, message: 'Экспорт выключен' };
  const e = env();
  if (!e.GITHUB_EXPORT_TOKEN || !e.GITHUB_EXPORT_REPO) {
    const message = 'Не заданы GITHUB_EXPORT_TOKEN / GITHUB_EXPORT_REPO';
    await recordStatus(false, message);
    return { ok: false, message };
  }
  try {
    const files = buildExportFiles(await loadExportInput());
    const url = await commitTree(
      { token: e.GITHUB_EXPORT_TOKEN, repo: e.GITHUB_EXPORT_REPO, branch: e.GITHUB_EXPORT_BRANCH },
      files,
      `Обновление материалов: ${reason}`,
    );
    const message = url ? `Готово: ${files.length} файлов` : 'Изменений нет';
    await recordStatus(true, message, url);
    return { ok: true, message };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('github export failed:', message);
    await recordStatus(false, message);
    return { ok: false, message };
  }
}

/** Run the export after the response is sent, so moderation stays instant. */
export function scheduleExport(reason: string) {
  after(() => runExport(reason));
}
