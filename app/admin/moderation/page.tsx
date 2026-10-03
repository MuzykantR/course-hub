import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { AdminPageTitle } from '@/components/admin/Table';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { EmptyState, SectionTitle } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { moderationQueue } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { ModerationForm } from './ModerationForm';

export const metadata: Metadata = { title: 'Модерация' };

const itemClass =
  'flex flex-col gap-4 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo';

export default async function ModerationPage() {
  await requireTeacher();
  const [{ solutions, reports }, people] = await Promise.all([moderationQueue(), getPeople()]);
  const name = (id: number) => people.studentById.get(id)?.name ?? 'студент удалён';

  return (
    <>
      <AdminPageTitle title="Модерация">
        <p className="text-sm text-theme-secondary">
          Сначала самые старые заявки. «Поправить» — открыть полную форму и отредактировать перед
          публикацией.
        </p>
      </AdminPageTitle>

      <section className="flex flex-col gap-4">
        <SectionTitle count={solutions.length}>Решения</SectionTitle>
        {solutions.length === 0 ? (
          <EmptyState>Новых решений нет.</EmptyState>
        ) : (
          solutions.map((s) => (
            <article key={s.id} className={itemClass}>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={`/admin/tasks/${s.task.id}`}
                  className="text-lg font-bold hover:underline"
                >
                  {s.task.lesson.number}. {s.task.title}
                </Link>
                <span className="text-sm text-theme-secondary">{name(s.author_student_id)}</span>
                <span className="text-xs text-theme-muted">{formatDate(s.created_at)}</span>
                <Link
                  href={`/admin/solutions/${s.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Поправить
                </Link>
              </header>
              <CodeBlock code={s.code} lang="python" className="my-0" />
              {s.explanation_md && <MarkdownContent source={s.explanation_md} />}
              <ModerationForm kind="solution" id={s.id} />
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle count={reports.length}>Доклады</SectionTitle>
        {reports.length === 0 ? (
          <EmptyState>Новых докладов нет.</EmptyState>
        ) : (
          reports.map((r) => (
            <article key={r.id} className={itemClass}>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-bold uppercase text-theme-muted">
                  {r.library}
                </span>
                <span className="text-lg font-bold">{r.title}</span>
                <span className="text-sm text-theme-secondary">
                  {r.authorIds.map(name).join(', ')}
                </span>
                <span className="text-xs text-theme-muted">
                  {people.groupById.get(r.group_id)?.name} · {formatDate(r.created_at)}
                </span>
                <Link
                  href={`/admin/reports/${r.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Поправить
                </Link>
              </header>
              {r.summary && <p className="text-theme-secondary">{r.summary}</p>}
              <details className="rounded-xl border-2 border-theme-borderSubtle p-4">
                <summary className="cursor-pointer font-semibold">Текст доклада</summary>
                <MarkdownContent
                  source={r.content_md}
                  assetBase={`/api/assets/reports/${r.id}`}
                  className="mt-3"
                />
              </details>
              <ModerationForm kind="report" id={r.id} />
            </article>
          ))
        )}
      </section>
    </>
  );
}
