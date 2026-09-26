import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Presentation } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { PyRunner } from '@/components/code/PyRunner';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { Badge, DifficultyBadge, TagLink, VerdictBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getTask } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { kbHref } from '@/lib/validation/kb';
import { parseTaskTests } from '@/lib/python/protocol';
import { parseIdParam } from '@/lib/validation/params';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const task = await getTask(parseIdParam((await params).id));
  return { title: task?.title ?? 'Задача' };
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
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
            ? { href: `/lessons/${task.lesson.id}`, label: `Занятие ${task.lesson.number}` }
            : undefined
        }
        eyebrow={task.lesson ? `${task.lesson.title} · ${formatDate(task.lesson.date)}` : 'Задача'}
        title={task.title}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={task.difficulty} />
          <VerdictBadge verdict={task.verdict} />
          {task.tags.map((tag) => (
            <TagLink key={tag} tag={tag} href={kbHref({}, { tag })} />
          ))}
        </div>
      </PageHeader>

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="У доски"
            value={
              assigned ? (
                <Link href={`/students/${assigned.slug}`} className="hover:underline">
                  {assigned.name}
                </Link>
              ) : (
                '—'
              )
            }
          />
          <Stat label="Вердикт" value={<VerdictBadge verdict={task.verdict} />} />
          <Stat label="Время" value={task.runtime_ms != null ? `${task.runtime_ms} мс` : '—'} />
          <Stat label="Память" value={task.memory_mb != null ? `${task.memory_mb} МБ` : '—'} />
        </dl>
      </Card>

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

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle count={task.solutions.length}>Решения</SectionTitle>
          {session.role === 'student' && (
            <Link
              href={`/submit/solution?task=${task.id}`}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-theme-border bg-theme-accent px-4 py-2 text-sm font-bold text-theme-accentText shadow-neo-sm transition hover:-translate-y-0.5"
            >
              + Предложить решение
            </Link>
          )}
        </div>
        {task.solutions.length === 0 ? (
          <EmptyState>Решений пока нет.</EmptyState>
        ) : (
          task.solutions.map((s) => {
            const author = people.studentById.get(s.author_student_id);
            return (
              <article
                key={s.id}
                className="flex flex-col gap-3 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur"
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
                      <Presentation className="h-3.5 w-3.5" /> Разобрано у доски
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
          })
        )}
      </section>
    </>
  );
}
