import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle, AdminTable, StatusPill } from '@/components/admin/Table';
import { VerdictBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminLesson } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { parseIdParam } from '@/lib/validation/params';
import { deleteLesson } from '../actions';
import { LessonForm } from '../LessonForm';

export const metadata: Metadata = { title: 'Занятие' };

export default async function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const [lesson, people, { saved }] = await Promise.all([
    adminLesson(id),
    getPeople(),
    searchParams,
  ]);
  if (!lesson) notFound();

  return (
    <>
      <AdminPageTitle title={`Занятие ${lesson.number}`}>
        <Link
          href={`/lessons/${lesson.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-theme-secondary hover:underline"
        >
          Открыть на сайте <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </AdminPageTitle>
      {saved && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Сохранено.
        </p>
      )}
      <LessonForm lesson={lesson} groups={people.groups} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Задачи занятия</h2>
          <Link
            href={`/admin/tasks/new?lesson=${lesson.id}`}
            className="rounded-pill border-2 border-theme-border bg-theme-card px-4 py-2 text-sm font-bold shadow-neo-sm"
          >
            + Добавить задачу
          </Link>
        </div>
        {lesson.tasks.length === 0 ? (
          <EmptyState>Задач пока нет.</EmptyState>
        ) : (
          <AdminTable head={['#', 'Задача', 'Статус', 'Вердикт', 'У доски']}>
            {lesson.tasks.map((t) => (
              <tr key={t.id}>
                <td className="font-mono">{t.order}</td>
                <td>
                  <Link href={`/admin/tasks/${t.id}`} className="font-bold hover:underline">
                    {t.title}
                  </Link>
                </td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td>
                  <VerdictBadge verdict={t.verdict} />
                </td>
                <td>
                  {t.assigned_student_id
                    ? people.studentById.get(t.assigned_student_id)?.name
                    : '—'}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      <ConfirmForm
        action={deleteLesson}
        hidden={{ id: lesson.id }}
        confirm={`Удалить занятие «${lesson.title}» вместе со всеми задачами и решениями? Это необратимо.`}
        className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
      >
        <Button type="submit" variant="secondary" className="text-rose-700 dark:text-rose-300">
          Удалить занятие
        </Button>
      </ConfirmForm>
    </>
  );
}
