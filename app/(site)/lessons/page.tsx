import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { listLessons } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate, plural } from '@/lib/format';

export const metadata: Metadata = { title: 'Занятия' };

export default async function LessonsPage() {
  await requireSession();
  const [lessons, people] = await Promise.all([listLessons(), getPeople()]);

  return (
    <>
      <PageHeader eyebrow="Семинары" title="Занятия" />
      {lessons.length === 0 ? (
        <EmptyState>Занятий пока нет.</EmptyState>
      ) : (
        <ol className="flex flex-col gap-3">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/lessons/${l.id}`}
                className="flex flex-col gap-2 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-theme-border bg-theme-accent font-mono text-lg font-bold text-theme-accentText">
                  {l.number}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lg font-bold leading-snug">{l.title}</span>
                  <span className="text-sm text-theme-muted">
                    {formatDate(l.date)}
                    {l.groupIds.length > 0 && ' · '}
                    {/* Links inside a link are invalid HTML: render group names as text here. */}
                    {l.groupIds
                      .map((id) => people.groupById.get(id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </span>
                <span className="text-sm font-bold text-theme-secondary">
                  {l.taskCount} {plural(l.taskCount, ['задача', 'задачи', 'задач'])}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
