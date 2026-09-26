import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GroupLinks } from '@/components/kb/People';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { DifficultyBadge, VerdictBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getLesson } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate, plural } from '@/lib/format';
import { parseIdParam } from '@/lib/validation/params';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const lesson = await getLesson(parseIdParam((await params).id));
  return { title: lesson ? `Занятие ${lesson.number}: ${lesson.title}` : 'Занятие' };
}

export default async function LessonPage({ params }: Props) {
  await requireSession();
  const id = parseIdParam((await params).id);
  const [lesson, people] = await Promise.all([getLesson(id), getPeople()]);
  if (!lesson) notFound();

  return (
    <>
      <PageHeader
        back={{ href: '/lessons', label: 'Все занятия' }}
        eyebrow={`Занятие ${lesson.number} · ${formatDate(lesson.date)}`}
        title={lesson.title}
      >
        {lesson.groupIds.length > 0 && (
          <p className="text-sm text-theme-secondary">
            <GroupLinks ids={lesson.groupIds} people={people} />
          </p>
        )}
      </PageHeader>

      {lesson.description_md.trim() && (
        <Card size="lg">
          <MarkdownContent source={lesson.description_md} />
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <SectionTitle count={lesson.tasks.length}>Задачи</SectionTitle>
        {lesson.tasks.length === 0 ? (
          <EmptyState>Задачи этого занятия ещё не опубликованы.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-3">
            {lesson.tasks.map((t) => {
              const student = t.assigned_student_id
                ? people.studentById.get(t.assigned_student_id)
                : undefined;
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-theme-muted">#{t.order}</span>
                    <Link href={`/tasks/${t.id}`} className="text-lg font-bold hover:underline">
                      {t.title}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-theme-secondary">
                    <DifficultyBadge difficulty={t.difficulty} />
                    <VerdictBadge verdict={t.verdict} />
                    {student && (
                      <span>
                        У доски:{' '}
                        <Link
                          href={`/students/${student.slug}`}
                          className="font-semibold hover:underline"
                        >
                          {student.name}
                        </Link>
                      </span>
                    )}
                    <span className="text-theme-muted">
                      · {t.solutionCount}{' '}
                      {plural(t.solutionCount, ['решение', 'решения', 'решений'])}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {lesson.reports.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle count={lesson.reports.length}>Доклады</SectionTitle>
          <ul className="grid gap-3 md:grid-cols-2">
            {lesson.reports.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/reports/${r.slug}`}
                  className="flex flex-col gap-1 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo transition hover:-translate-y-0.5"
                >
                  <span className="font-mono text-xs font-bold uppercase text-theme-muted">
                    {r.library}
                  </span>
                  <span className="font-bold">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
