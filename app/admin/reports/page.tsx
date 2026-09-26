import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageTitle, AdminTable, FilterLinks, StatusPill } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminReports } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatShortDate } from '@/lib/format';
import { REVIEW_STATUSES } from '@/lib/validation/admin';

export const metadata: Metadata = { title: 'Доклады' };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireTeacher();
  const { status: raw } = await searchParams;
  const status = REVIEW_STATUSES.find((s) => s === raw);
  const [reports, people] = await Promise.all([adminReports({ status }), getPeople()]);

  return (
    <>
      <AdminPageTitle
        title="Доклады"
        action={{ href: '/admin/reports/new', label: 'Новый доклад' }}
      />
      <FilterLinks
        current={status}
        hrefFor={(s) => (s ? `/admin/reports?status=${s}` : '/admin/reports')}
        options={[
          { value: undefined, label: 'Все' },
          { value: 'pending', label: 'На модерации' },
          { value: 'approved', label: 'Опубликованные' },
          { value: 'rejected', label: 'Отклонённые' },
        ]}
      />
      {reports.length === 0 ? (
        <EmptyState>Докладов нет.</EmptyState>
      ) : (
        <AdminTable head={['Доклад', 'Библиотека', 'Авторы', 'Группа', 'Статус', 'Дата']}>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/admin/reports/${r.id}`} className="font-bold hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="font-mono text-xs">{r.library}</td>
              <td>
                {r.authorIds
                  .map((id) => people.studentById.get(id)?.name)
                  .filter(Boolean)
                  .join(', ') || '—'}
              </td>
              <td>{people.groupById.get(r.group_id)?.name}</td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <td className="whitespace-nowrap text-theme-muted">
                {formatShortDate(r.created_at)}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
