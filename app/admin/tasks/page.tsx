import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageTitle, AdminTable, FilterLinks, StatusPill } from '@/components/admin/Table';
import { VerdictBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminTasks } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { TASK_STATUSES } from '@/lib/validation/admin';

export const metadata: Metadata = { title: 'Задачи' };

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireTeacher();
  const { status: rawStatus } = await searchParams;
  const status = TASK_STATUSES.find((s) => s === rawStatus);
  const [tasks, people] = await Promise.all([adminTasks({ status }), getPeople()]);

  return (
    <>
      <AdminPageTitle title="Задачи" action={{ href: '/admin/tasks/new', label: 'Новая задача' }} />
      <FilterLinks
        current={status}
        hrefFor={(s) => (s ? `/admin/tasks?status=${s}` : '/admin/tasks')}
        options={[
          { value: undefined, label: 'Все' },
          { value: 'draft', label: 'Черновики' },
          { value: 'assigned', label: 'Назначены' },
          { value: 'solved', label: 'Решены' },
        ]}
      />
      {tasks.length === 0 ? (
        <EmptyState>Задач нет.</EmptyState>
      ) : (
        <AdminTable head={['Занятие', 'Задача', 'Статус', 'Вердикт', 'У доски', 'Решения']}>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td className="whitespace-nowrap font-mono text-theme-muted">
                {t.lesson.number}.{t.order}
              </td>
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
                {t.assigned_student_id ? people.studentById.get(t.assigned_student_id)?.name : '—'}
              </td>
              <td className="whitespace-nowrap">
                <Link href={`/admin/solutions?task=${t.id}`} className="hover:underline">
                  {t.approved}
                  {t.pending > 0 && (
                    <span className="ml-1 font-bold text-amber-700 dark:text-amber-300">
                      +{t.pending} ждут
                    </span>
                  )}
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
