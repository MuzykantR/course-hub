import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageTitle } from '@/components/admin/Table';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { getPeople } from '@/lib/db/queries/people';
import { plural } from '@/lib/format';
import { GroupForm } from './Forms';

export const metadata: Metadata = { title: 'Группы и студенты' };

export default async function AdminGroupsPage() {
  await requireTeacher();
  const people = await getPeople();

  return (
    <>
      <AdminPageTitle title="Группы и студенты" />
      {people.groups.length === 0 ? (
        <EmptyState>Групп пока нет — создайте первую ниже.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {people.groups.map((g) => {
            const n = people.students.filter((s) => s.groupId === g.id).length;
            return (
              <li key={g.id}>
                <Link
                  href={`/admin/groups/${g.id}`}
                  className="flex flex-col gap-1 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo transition hover:-translate-y-0.5"
                >
                  <span className="text-lg font-bold">{g.name}</span>
                  <span className="text-sm text-theme-muted">
                    {n} {plural(n, ['студент', 'студента', 'студентов'])} · /{g.slug}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Card>
        <h2 className="mb-3 text-lg font-bold">Новая группа</h2>
        <GroupForm />
      </Card>
    </>
  );
}
