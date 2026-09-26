import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageTitle, AdminTable } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminLessons } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Занятия' };

export default async function AdminLessonsPage() {
  await requireTeacher();
  const [lessons, people] = await Promise.all([adminLessons(), getPeople()]);

  return (
    <>
      <AdminPageTitle
        title="Занятия"
        action={{ href: '/admin/lessons/new', label: 'Новое занятие' }}
      />
      {lessons.length === 0 ? (
        <EmptyState>Занятий пока нет.</EmptyState>
      ) : (
        <AdminTable head={['№', 'Дата', 'Тема', 'Группы', 'Задач']}>
          {lessons.map((l) => (
            <tr key={l.id}>
              <td className="font-mono font-bold">{l.number}</td>
              <td className="whitespace-nowrap">{formatDate(l.date)}</td>
              <td>
                <Link href={`/admin/lessons/${l.id}`} className="font-bold hover:underline">
                  {l.title}
                </Link>
              </td>
              <td className="text-theme-secondary">
                {l.groupIds
                  .map((id) => people.groupById.get(id)?.name)
                  .filter(Boolean)
                  .join(', ') || '—'}
              </td>
              <td className="font-mono">{l.taskCount}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
