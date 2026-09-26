import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CodeBlock } from '@/components/code/CodeBlock';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle, StatusPill } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { requireTeacher } from '@/lib/auth/guards';
import { adminSolution, taskOptions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { parseIdParam } from '@/lib/validation/params';
import { deleteSolution } from '../actions';
import { SolutionForm } from '../SolutionForm';

export const metadata: Metadata = { title: 'Решение' };

export default async function EditSolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const [solution, tasks, people, { saved }] = await Promise.all([
    adminSolution(id),
    taskOptions(),
    getPeople(),
    searchParams,
  ]);
  if (!solution) notFound();
  const task = tasks.find((t) => t.id === solution.task_id);
  const author = people.studentById.get(solution.author_student_id);

  return (
    <>
      <AdminPageTitle title={`Решение: ${task?.title ?? 'задача'}`}>
        <div className="flex flex-wrap items-center gap-3 text-sm text-theme-secondary">
          <StatusPill status={solution.status} />
          <span>{author?.name ?? 'автор удалён'}</span>
          <span>прислано {formatDate(solution.created_at)}</span>
          <Link href={`/admin/tasks/${solution.task_id}`} className="font-semibold hover:underline">
            К задаче →
          </Link>
        </div>
      </AdminPageTitle>
      {saved && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Сохранено.
        </p>
      )}
      <details className="rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo-sm">
        <summary className="cursor-pointer font-bold">Предпросмотр кода</summary>
        <CodeBlock code={solution.code} lang="python" />
      </details>
      <SolutionForm
        solution={solution}
        tasks={tasks}
        groups={people.groups}
        students={people.students}
      />
      <ConfirmForm
        action={deleteSolution}
        hidden={{ id: solution.id }}
        confirm="Удалить это решение? Это необратимо."
        className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
      >
        <Button type="submit" variant="secondary" className="text-rose-700 dark:text-rose-300">
          Удалить решение
        </Button>
      </ConfirmForm>
    </>
  );
}
