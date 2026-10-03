import type { Metadata } from 'next';
import Link from 'next/link';
import { Presentation } from 'lucide-react';
import { AdminPageTitle, AdminTable, FilterLinks, StatusPill } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminSolutions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatShortDate } from '@/lib/format';
import { REVIEW_STATUSES } from '@/lib/validation/admin';

export const metadata: Metadata = { title: 'Решения' };

export default async function AdminSolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; task?: string }>;
}) {
  await requireTeacher();
  const sp = await searchParams;
  const status = REVIEW_STATUSES.find((s) => s === sp.status);
  const taskId = /^\d{1,18}$/.test(sp.task ?? '') ? Number(sp.task) : undefined;
  const [solutions, people] = await Promise.all([adminSolutions({ status, taskId }), getPeople()]);
  const href = (s: string | undefined) => {
    const qs = new URLSearchParams();
    if (s) qs.set('status', s);
    if (taskId) qs.set('task', String(taskId));
    const q = qs.toString();
    return q ? `/admin/solutions?${q}` : '/admin/solutions';
  };

  return (
    <>
      <AdminPageTitle
        title="Решения"
        action={{
          href: taskId ? `/admin/solutions/new?task=${taskId}` : '/admin/solutions/new',
          label: 'Добавить решение',
        }}
      >
        {taskId && (
          <p className="text-sm text-theme-secondary">
            Только задача #{taskId} ·{' '}
            <Link
              href={status ? `/admin/solutions?status=${status}` : '/admin/solutions'}
              className="font-semibold hover:underline"
            >
              показать все
            </Link>
          </p>
        )}
      </AdminPageTitle>
      <FilterLinks
        current={status}
        hrefFor={href}
        options={[
          { value: undefined, label: 'Все' },
          { value: 'pending', label: 'На модерации' },
          { value: 'approved', label: 'Одобренные' },
          { value: 'rejected', label: 'Отклонённые' },
        ]}
      />
      {solutions.length === 0 ? (
        <EmptyState>Решений нет.</EmptyState>
      ) : (
        <AdminTable head={['Задача', 'Автор', 'Статус', 'Дата']}>
          {solutions.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/admin/solutions/${s.id}`} className="font-bold hover:underline">
                  {s.task.title}
                </Link>
                {s.is_featured && (
                  <Presentation
                    className="ml-2 inline h-4 w-4 text-theme-muted"
                    aria-label="Разобрано на паре"
                  />
                )}
              </td>
              <td>{people.studentById.get(s.author_student_id)?.name ?? '—'}</td>
              <td>
                <StatusPill status={s.status} />
              </td>
              <td className="whitespace-nowrap text-theme-muted">
                {formatShortDate(s.created_at)}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
