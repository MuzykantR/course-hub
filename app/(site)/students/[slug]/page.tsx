import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getStudentContributions } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { kbHref } from '@/lib/validation/kb';
import { parseSlugParam } from '@/lib/validation/params';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const people = await getPeople();
  return {
    title: people.studentBySlug.get(parseSlugParam((await params).slug))?.name ?? 'Студент',
  };
}

const rowClass =
  'flex flex-wrap items-center gap-2 rounded-card border-2 border-theme-border bg-theme-card px-5 py-4 shadow-neo-sm';

export default async function StudentPage({ params }: Props) {
  await requireSession();
  const slug = parseSlugParam((await params).slug);
  const people = await getPeople();
  const student = people.studentBySlug.get(slug);
  if (!student) notFound();
  const group = people.groupById.get(student.groupId);
  const { tasks, reports } = await getStudentContributions(student.id);

  return (
    <>
      <PageHeader
        back={group ? { href: `/groups/${group.slug}`, label: group.name } : undefined}
        eyebrow="Студент"
        title={student.name}
      >
        <Link
          href={kbHref({}, { student: student.slug })}
          className="w-fit text-sm font-bold underline decoration-theme-accent decoration-2 underline-offset-2"
        >
          Всё в базе знаний →
        </Link>
      </PageHeader>

      <section className="flex flex-col gap-3">
        <SectionTitle count={tasks.length}>Задачи</SectionTitle>
        {tasks.length === 0 ? (
          <EmptyState>Опубликованных задач пока нет.</EmptyState>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className={rowClass}>
              <Link href={`/tasks/${t.id}`} className="font-bold hover:underline">
                {t.title}
              </Link>
              {t.presented && <Badge tone="accent">Решал на паре</Badge>}
              {t.date && (
                <span className="ml-auto text-xs text-theme-muted">{formatDate(t.date)}</span>
              )}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle count={reports.length}>Доклады</SectionTitle>
        {reports.length === 0 ? (
          <EmptyState>Докладов пока нет.</EmptyState>
        ) : (
          reports.map((r) => (
            <div key={r.slug} className={rowClass}>
              <Link href={`/reports/${r.slug}`} className="font-bold hover:underline">
                {r.title}
              </Link>
              <span className="font-mono text-xs text-theme-muted">{r.library}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
