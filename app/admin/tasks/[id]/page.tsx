import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { requireTeacher } from '@/lib/auth/guards';
import { adminTask, lessonOptions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { parseIdParam } from '@/lib/validation/params';
import { deleteTask } from '../actions';
import { TaskForm } from '../TaskForm';

export const metadata: Metadata = { title: 'Задача' };

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const [task, lessons, people, { saved }] = await Promise.all([
    adminTask(id),
    lessonOptions(),
    getPeople(),
    searchParams,
  ]);
  if (!task) notFound();

  return (
    <>
      <AdminPageTitle title={task.title}>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-theme-secondary">
          {task.status !== 'draft' && (
            <Link
              href={`/tasks/${task.id}`}
              className="inline-flex items-center gap-1 hover:underline"
            >
              Открыть на сайте <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link href={`/admin/solutions?task=${task.id}`} className="hover:underline">
            Решения задачи →
          </Link>
          <Link href={`/admin/solutions/new?task=${task.id}`} className="hover:underline">
            + Добавить решение
          </Link>
        </div>
      </AdminPageTitle>
      {saved && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-success-100 px-3 py-2 text-sm font-medium text-success-900 dark:bg-success-950 dark:text-success-200"
        >
          Сохранено.
        </p>
      )}
      <TaskForm task={task} lessons={lessons} groups={people.groups} students={people.students} />
      <ConfirmForm
        action={deleteTask}
        hidden={{ id: task.id }}
        confirm={`Удалить задачу «${task.title}» вместе с решениями? Это необратимо.`}
        className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
      >
        <Button type="submit" variant="secondary" className="text-danger-700 dark:text-danger-300">
          Удалить задачу
        </Button>
      </ConfirmForm>
    </>
  );
}
