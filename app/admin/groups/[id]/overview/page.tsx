import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPageTitle } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { adminGroupStudents, groupOverview } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { parseIdParam } from '@/lib/validation/params';

export const metadata: Metadata = { title: 'Обзор группы' };

const VERDICT_MARK: Record<string, { mark: string; cls: string; title: string }> = {
  accepted: { mark: '✓', cls: 'bg-success-300 text-success-950', title: 'У доски: Accepted' },
  wrong_answer: { mark: '✗', cls: 'bg-danger-300 text-danger-950', title: 'У доски: Wrong Answer' },
  tle: { mark: '⏱', cls: 'bg-warning-300 text-warning-950', title: 'У доски: Time Limit' },
  runtime_error: { mark: '!', cls: 'bg-danger-300 text-danger-950', title: 'У доски: Runtime Error' },
  not_checked: { mark: '•', cls: 'bg-info-300 text-info-950', title: 'У доски: не проверено' },
};

export default async function GroupOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const people = await getPeople();
  const group = people.groupById.get(id);
  if (!group) notFound();
  const [students, { lessons, solutions, reports }] = await Promise.all([
    adminGroupStudents(id),
    groupOverview(id),
  ]);

  const tasks = lessons.flatMap((l) =>
    [...l.tasks].sort((a, b) => a.order - b.order).map((t) => ({ ...t, lessonNumber: l.number })),
  );
  const solutionKey = (taskId: number, studentId: number) => `${taskId}:${studentId}`;
  const solutionStatus = new Map<string, string>();
  for (const s of solutions) {
    const key = solutionKey(s.task_id, s.author_student_id);
    // 'approved' wins over 'pending' when a student has both.
    if (solutionStatus.get(key) !== 'approved') solutionStatus.set(key, s.status);
  }
  const reportCount = new Map<number, number>();
  for (const r of reports) reportCount.set(r.student_id, (reportCount.get(r.student_id) ?? 0) + 1);

  return (
    <>
      <AdminPageTitle title={`Обзор: ${group.name}`}>
        <Link
          href={`/admin/groups/${id}`}
          className="text-sm font-semibold text-theme-secondary hover:underline"
        >
          ← К группе
        </Link>
      </AdminPageTitle>

      <div className="flex flex-wrap gap-3 text-xs text-theme-secondary">
        {Object.values(VERDICT_MARK).map((v) => (
          <span key={v.mark} className="inline-flex items-center gap-1">
            <span
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded font-bold',
                v.cls,
              )}
            >
              {v.mark}
            </span>
            {v.title}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-theme-border font-bold">
            Р
          </span>
          решение опубликовано
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-dashed border-warning-500 font-bold">
            Р
          </span>
          решение ждёт модерации
        </span>
      </div>

      {students.length === 0 || tasks.length === 0 ? (
        <EmptyState>Нужны студенты и задачи в занятиях этой группы.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border-2 border-theme-border bg-theme-card shadow-neo">
          <table className="text-sm">
            <thead className="bg-theme-cardMuted">
              <tr>
                <th className="sticky left-0 z-10 bg-theme-cardMuted px-3 py-2 text-left font-bold">
                  Студент
                </th>
                {tasks.map((t) => (
                  <th
                    key={t.id}
                    className="px-1 py-2 text-center font-mono text-xs font-bold"
                    title={t.title}
                  >
                    <Link href={`/admin/tasks/${t.id}`} className="hover:underline">
                      {t.lessonNumber}.{t.order}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-bold">Доклады</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-theme-borderSubtle">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-theme-card px-3 py-2 font-semibold">
                    <Link href={`/admin/students/${s.id}`} className="hover:underline">
                      {s.full_name}
                    </Link>
                  </td>
                  {tasks.map((t) => {
                    const verdict =
                      t.assigned_student_id === s.id ? VERDICT_MARK[t.verdict] : undefined;
                    const sol = solutionStatus.get(solutionKey(t.id, s.id));
                    return (
                      <td key={t.id} className="px-1 py-1.5 text-center">
                        <span className="inline-flex gap-0.5">
                          {verdict && (
                            <span
                              title={verdict.title}
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded font-bold',
                                verdict.cls,
                              )}
                            >
                              {verdict.mark}
                            </span>
                          )}
                          {sol && (
                            <span
                              title={
                                sol === 'approved'
                                  ? 'Решение опубликовано'
                                  : 'Решение ждёт модерации'
                              }
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded border-2 font-bold',
                                sol === 'approved'
                                  ? 'border-theme-border'
                                  : 'border-dashed border-warning-500',
                              )}
                            >
                              Р
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-mono">
                    {reportCount.get(s.id) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
