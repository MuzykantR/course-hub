import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getPeople } from '@/lib/db/queries/people';
import { plural } from '@/lib/format';

export const metadata: Metadata = { title: 'Группы' };

export default async function GroupsPage() {
  await requireSession();
  const people = await getPeople();

  return (
    <>
      <PageHeader eyebrow="Люди" title="Группы" />
      {people.groups.length === 0 ? (
        <EmptyState>Групп пока нет.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {people.groups.map((g) => {
            const n = people.students.filter((s) => s.groupId === g.id).length;
            return (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.slug}`}
                  className="flex flex-col gap-1 rounded-card border-2 border-theme-border bg-theme-card p-6 shadow-neo backdrop-blur transition hover:-translate-y-0.5"
                >
                  <span className="text-xl font-bold">{g.name}</span>
                  <span className="text-sm text-theme-muted">
                    {n} {plural(n, ['студент', 'студента', 'студентов'])}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
