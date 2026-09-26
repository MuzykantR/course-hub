import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GroupLinks, StudentLinks } from '@/components/kb/People';
import { Markdown } from '@/components/markdown/Markdown';
import { TagLink } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getReport } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { markdownToHast, type TocEntry } from '@/lib/markdown/pipeline';
import { kbHref } from '@/lib/validation/kb';
import { parseSlugParam } from '@/lib/validation/params';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireSession();
  const report = await getReport(parseSlugParam((await params).slug));
  return { title: report?.title ?? 'Доклад', description: report?.summary || undefined };
}

function Toc({ toc }: { toc: TocEntry[] }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {toc.map((e) => (
        <li key={e.id} className={e.depth === 3 ? 'pl-4' : undefined}>
          <a
            href={`#${e.id}`}
            className={
              e.depth === 2
                ? 'font-semibold hover:underline'
                : 'text-theme-secondary hover:text-theme-main hover:underline'
            }
          >
            {e.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default async function ReportPage({ params }: Props) {
  await requireSession();
  const slug = parseSlugParam((await params).slug);
  const [report, people] = await Promise.all([getReport(slug), getPeople()]);
  if (!report) notFound();

  const { hast, toc } = await markdownToHast(report.content_md, {
    assetBase: `/api/assets/reports/${report.id}`,
  });

  return (
    <>
      <PageHeader
        back={{ href: kbHref({}, { type: 'report' }), label: 'Все доклады' }}
        eyebrow={report.library}
        title={report.title}
      >
        {report.summary && <p className="max-w-3xl text-theme-secondary">{report.summary}</p>}
        <div className="flex flex-col gap-1 text-sm text-theme-secondary">
          {report.authorIds.length > 0 && (
            <span>
              {report.authorIds.length > 1 ? 'Авторы: ' : 'Автор: '}
              <StudentLinks ids={report.authorIds} people={people} />
            </span>
          )}
          <span className="text-theme-muted">
            <GroupLinks ids={[report.group_id]} people={people} />
            {report.lesson && (
              <>
                {' · '}
                <Link href={`/lessons/${report.lesson.id}`} className="hover:underline">
                  Занятие {report.lesson.number}
                </Link>
              </>
            )}
            {' · '}
            {formatDate(report.lesson?.date ?? report.created_at)}
          </span>
        </div>
        {report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {report.tags.map((tag) => (
              <TagLink key={tag} tag={tag} href={kbHref({}, { tag })} />
            ))}
          </div>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {toc.length > 1 && (
          <aside className="lg:order-2">
            <details className="rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo-sm lg:hidden">
              <summary className="cursor-pointer font-bold">Содержание</summary>
              <div className="mt-3">
                <Toc toc={toc} />
              </div>
            </details>
            <nav
              aria-label="Содержание"
              className="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo-sm lg:block"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-theme-muted">
                Содержание
              </p>
              <Toc toc={toc} />
            </nav>
          </aside>
        )}
        <Card size="lg" className={toc.length > 1 ? 'min-w-0 lg:order-1' : 'min-w-0 lg:col-span-2'}>
          <Markdown hast={hast} />
        </Card>
      </div>
    </>
  );
}
