import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { taskOptions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { SolutionForm } from '../SolutionForm';

export const metadata: Metadata = { title: 'Новое решение' };

export default async function NewSolutionPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  await requireTeacher();
  const [{ task }, tasks, people] = await Promise.all([searchParams, taskOptions(), getPeople()]);
  if (tasks.length === 0) {
    return (
      <>
        <AdminPageTitle title="Новое решение" />
        <EmptyState>Сначала создайте задачу.</EmptyState>
      </>
    );
  }
  const taskId = tasks.find((t) => String(t.id) === task)?.id ?? null;

  return (
    <>
      <AdminPageTitle title="Новое решение" />
      <SolutionForm
        tasks={tasks}
        groups={people.groups}
        students={people.students}
        solution={{
          task_id: taskId,
          author_student_id: null,
          code: '',
          explanation_md: null,
          is_featured: false,
          status: 'approved',
          review_comment: null,
        }}
      />
    </>
  );
}
