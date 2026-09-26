import type { Metadata } from 'next';
import { SubmissionBlocked } from '@/components/kb/SubmissionBlocked';
import { EmptyState, PageHeader } from '@/components/ui/PageHeader';
import { requireIdentifiedStudent } from '@/lib/auth/guards';
import { publishedTaskOptions } from '@/lib/db/queries/content';
import { MAX_PENDING_PER_STUDENT, submissionPrecheck } from '@/lib/submissions';
import { SolutionSubmitForm } from '../SolutionSubmitForm';

export const metadata: Metadata = { title: 'Предложить решение' };

export default async function SubmitSolutionPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task } = await searchParams;
  const taskParam = /^\d{1,18}$/.test(task ?? '') ? task : undefined;
  const { studentId } = await requireIdentifiedStudent(
    taskParam ? `/submit/solution?task=${taskParam}` : '/submit/solution',
  );
  const [blocked, tasks] = await Promise.all([
    submissionPrecheck(studentId),
    publishedTaskOptions(),
  ]);

  return (
    <>
      <PageHeader eyebrow="Заявка" title="Предложить решение">
        <p className="max-w-2xl text-theme-secondary">
          Решение попадёт к преподавателю на проверку и появится на сайте после одобрения.
          Одновременно на проверке может быть не больше {MAX_PENDING_PER_STUDENT} ваших заявок.
        </p>
      </PageHeader>
      {blocked ? (
        <SubmissionBlocked reason={blocked} />
      ) : tasks.length === 0 ? (
        <EmptyState>Пока нет опубликованных задач.</EmptyState>
      ) : (
        <SolutionSubmitForm
          tasks={tasks}
          taskId={tasks.find((t) => String(t.id) === taskParam)?.id ?? null}
        />
      )}
    </>
  );
}
