import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Presentation } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { PyRunner } from '@/components/code/PyRunner';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getTask } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate, formatShortDate } from '@/lib/format';
import { parseTaskTests } from '@/lib/python/protocol';
import { parseIdParam } from '@/lib/validation/params';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const task = await getTask(parseIdParam((await params).id));
  return { title: task?.title ?? 'Задача' };
}

export default async function TaskPage({ params }: Props) {
  const session = await requireSession();
  const id = parseIdParam((await params).id);
  const [task, people] = await Promise.all([getTask(id), getPeople()]);
  if (!task) notFound();

  const assigned = task.assigned_student_id
    ? people.studentById.get(task.assigned_student_id)
    : undefined;

  return (
    <>
      <PageHeader
        back={
          task.lesson
            ? {
                href: `/lessons/${task.lesson.id}`,
                label: `Занятие ${task.lesson.number}. ${task.lesson.title}, ${formatDate(task.lesson.date)}`,
              }
            : undefined
        }
        title={task.title}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={task.difficulty} />
        </div>
      </PageHeader>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="flex flex-col gap-4">
            <SectionTitle>Условие</SectionTitle>
            <Card size="lg">
              {task.statement_md.trim() ? (
                <MarkdownContent source={task.statement_md} />
              ) : (
                <p className="text-theme-muted">Условие ещё не добавлено.</p>
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-4">
            <SectionTitle>Попробовать</SectionTitle>
            <PyRunner
              tests={parseTaskTests(task.tests)}
              samples={task.solutions.map((s) => ({
                label: people.studentById.get(s.author_student_id)?.name ?? 'Решение',
                code: s.code,
              }))}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          {assigned && (
            <section className="flex flex-col gap-1 rounded-card border-2 border-theme-border bg-theme-accent p-5 text-theme-accentText shadow-neo">
              <h2 className="text-sm font-semibold opacity-70">Решал на паре</h2>
              <Link
                href={`/students/${assigned.slug}`}
                className="font-display text-lg font-bold hover:underline"
              >
                {assigned.name}
              </Link>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <SectionTitle count={task.solutions.length}>Решения</SectionTitle>
            {task.solutions.length === 0 ? (
              <EmptyState>Решений пока нет.</EmptyState>
            ) : (
              <ul className="flex flex-col divide-y-2 divide-theme-cardMuted overflow-hidden rounded-card border-2 border-theme-border bg-theme-card shadow-neo backdrop-blur">
                {task.solutions.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#solution-${s.id}`}
                      className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-theme-cardMuted"
                    >
                      <span className="font-semibold">
                        {people.studentById.get(s.author_student_id)?.name ?? 'Автор удалён'}
                      </span>
                      <span className="shrink-0 text-xs text-theme-muted">
                        {formatShortDate(s.created_at)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {session.role === 'student' && (
              <Link
                href={`/submit/solution?task=${task.id}`}
                className="inline-flex h-11 items-center justify-center rounded-pill border-2 border-theme-border bg-theme-card px-5 text-sm font-bold shadow-neo-sm transition hover:-translate-y-0.5"
              >
                Предложить своё решение
              </Link>
            )}
          </section>
        </aside>
      </div>

      {task.solutions.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Код решений</SectionTitle>
          {task.solutions.map((s) => {
            const author = people.studentById.get(s.author_student_id);
            return (
              <article
                key={s.id}
                id={`solution-${s.id}`}
                className="flex scroll-mt-6 flex-col gap-3 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {author ? (
                    <Link href={`/students/${author.slug}`} className="font-bold hover:underline">
                      {author.name}
                    </Link>
                  ) : (
                    <span className="font-bold">Автор удалён</span>
                  )}
                  {s.is_featured && (
                    <Badge tone="accent">
                      <Presentation className="h-3.5 w-3.5" /> Разобрано на паре
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-theme-muted">
                    {formatDate(s.created_at)}
                  </span>
                </div>
                <CodeBlock code={s.code} lang="python" className="my-0" />
                {s.explanation_md && <MarkdownContent source={s.explanation_md} />}
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
