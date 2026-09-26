import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getContributionCounts } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { kbHref } from '@/lib/validation/kb';
import { parseSlugParam } from '@/lib/validation/params';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const people = await getPeople();
  return { title: people.groupBySlug.get(parseSlugParam((await params).slug))?.name ?? 'Группа' };
}

export default async function GroupPage({ params }: Props) {
  await requireSession();
  const slug = parseSlugParam((await params).slug);
  const [people, countsOf] = await Promise.all([getPeople(), getContributionCounts()]);
  const group = people.groupBySlug.get(slug);
  if (!group) notFound();
  const students = people.students.filter((s) => s.groupId === group.id);

  return (
    <>
      <PageHeader
        back={{ href: '/groups', label: 'Все группы' }}
        eyebrow="Группа"
        title={group.name}
      >
        <Link
          href={kbHref({}, { group: group.slug })}
          className="w-fit text-sm font-bold underline decoration-theme-accent decoration-2 underline-offset-2"
        >
          Материалы группы в базе знаний →
        </Link>
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState>В группе пока нет студентов.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border-2 border-theme-border bg-theme-card shadow-neo">
          <table className="w-full min-w-[20rem] text-sm">
            <thead className="bg-theme-cardMuted text-left">
              <tr>
                <th className="px-4 py-3 font-bold">Студент</th>
                <th className="px-4 py-3 text-right font-bold">Задачи</th>
                <th className="px-4 py-3 text-right font-bold">Доклады</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const c = countsOf(s.id);
                return (
                  <tr key={s.id} className="border-t border-theme-borderSubtle">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.slug}`} className="font-semibold hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.tasks || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{c.reports || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
