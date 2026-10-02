import Link from 'next/link';
import { Presentation, Search } from 'lucide-react';
import { StudentLinks } from '@/components/kb/People';
import { Badge, TagLink } from '@/components/ui/Badge';
import { EmptyState, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getHomeData, getLesson } from '@/lib/db/queries/content';
import { listKbTags } from '@/lib/db/queries/kb';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate, formatShortDate, plainExcerpt, plural } from '@/lib/format';
import { kbHref } from '@/lib/validation/kb';

const card = 'rounded-card border-2 border-theme-border bg-theme-card shadow-neo backdrop-blur';

export default async function Home() {
  await requireSession();
  const [{ counts, recentSolutions, recentReports, latestLesson }, people, tags] =
    await Promise.all([getHomeData(), getPeople(), listKbTags()]);
  const lesson = latestLesson ? await getLesson(latestLesson.id) : null;
  const excerpt = lesson ? plainExcerpt(lesson.description_md) : '';
  const topTags = tags.slice(0, 6);
  type Part = { value: number; forms: [string, string, string]; anchor: string };
  const lessonParts: Part[] = lesson
    ? (
        [
          { value: lesson.tasks.length, forms: ['задача', 'задачи', 'задач'], anchor: '#tasks' },
          {
            value: lesson.tasks.reduce((n, t) => n + t.solutionCount, 0),
            forms: ['решение', 'решения', 'решений'],
            anchor: '#tasks',
          },
          {
            value: lesson.reports.length,
            forms: ['доклад', 'доклада', 'докладов'],
            anchor: '#reports',
          },
        ] satisfies Part[]
      ).filter((p) => p.value > 0)
    : [];

  const stats: { forms: [string, string, string]; value: number; href: string }[] = [
    { forms: ['занятие', 'занятия', 'занятий'], value: counts.lessons, href: '/lessons' },
    { forms: ['задача', 'задачи', 'задач'], value: counts.tasks, href: '/kb?type=task' },
    { forms: ['решение', 'решения', 'решений'], value: counts.solutions, href: '/kb?type=task' },
    { forms: ['доклад', 'доклада', 'докладов'], value: counts.reports, href: '/kb?type=report' },
  ];

  return (
    <>
      <section className="flex flex-wrap gap-6 rounded-card-lg border-2 border-theme-border bg-theme-card p-5 shadow-neo-lg backdrop-blur md:p-8">
        <div className="flex min-w-0 flex-[999_1_26rem] flex-col gap-4">
          {lesson ? (
            <>
              <p className="text-sm font-semibold text-theme-muted">
                Последнее занятие, {formatDate(lesson.date)}
              </p>
              <h1 className="text-3xl font-extrabold leading-[1.05] md:text-[2.75rem]">
                {lesson.title}
              </h1>
              {excerpt && <p className="max-w-xl text-theme-secondary md:text-lg">{excerpt}</p>}
              <div className="flex flex-wrap gap-2">
                {lessonParts.map((part) => (
                  <Link
                    key={part.forms[0]}
                    href={`/lessons/${lesson.id}${part.anchor}`}
                    className="inline-flex items-baseline gap-1.5 rounded-pill border-2 border-theme-border bg-theme-card px-3 py-1 text-sm font-semibold hover:bg-theme-cardMuted"
                  >
                    <span className="font-display font-bold">{part.value}</span>
                    {plural(part.value, part.forms)}
                  </Link>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="inline-flex h-12 items-center rounded-pill border-2 border-theme-border bg-theme-accent px-6 font-bold text-theme-accentText shadow-neo transition hover:-translate-y-0.5"
                >
                  Открыть занятие
                </Link>
                <Link
                  href="/lessons"
                  className="inline-flex h-12 items-center rounded-pill border-2 border-theme-border bg-theme-card px-6 font-bold shadow-neo transition hover:-translate-y-0.5"
                >
                  Все занятия
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold md:text-[2.75rem]">Python HSE Hub</h1>
              <p className="max-w-xl text-theme-secondary">
                Занятий пока нет. Когда преподаватель добавит первое, оно появится здесь.
              </p>
            </>
          )}
        </div>

        <form
          action="/kb"
          role="search"
          className="flex min-w-0 flex-[1_1_18rem] flex-col gap-3 rounded-card border-2 border-theme-border bg-theme-card p-5"
        >
          <label htmlFor="home-q" className="font-display text-lg font-bold">
            Найти в базе знаний
          </label>
          <div className="flex gap-2">
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder="словари, numpy, два указателя"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-theme-border bg-theme-input px-3 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
            />
            <button
              type="submit"
              aria-label="Искать"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-theme-border bg-theme-accent text-theme-accentText"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {topTags.length > 0 && (
            <>
              <span className="text-sm text-theme-muted">Часто ищут</span>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(({ tag }) => (
                  <TagLink key={tag} tag={tag} href={kbHref({}, { tag })} />
                ))}
              </div>
            </>
          )}
          <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t-2 border-theme-cardMuted pt-3">
            {stats.map((s) => (
              <Link
                key={s.forms[0]}
                href={s.href}
                className="flex items-baseline gap-2 hover:underline"
              >
                <span className="font-display text-xl font-bold">{s.value}</span>
                <span className="text-sm text-theme-secondary">{plural(s.value, s.forms)}</span>
              </Link>
            ))}
          </div>
        </form>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle>Свежие решения</SectionTitle>
          {recentSolutions.length === 0 ? (
            <EmptyState>Решений пока нет.</EmptyState>
          ) : (
            <ul
              className={`${card} flex flex-col divide-y-2 divide-theme-cardMuted overflow-hidden`}
            >
              {recentSolutions.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/tasks/${s.task.id}`} className="font-bold hover:underline">
                      {s.task.title}
                    </Link>
                    {s.is_featured && (
                      <Badge tone="accent" className="px-1.5" title="Разобрано у доски">
                        <Presentation className="h-3.5 w-3.5" />
                      </Badge>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-theme-muted">
                      {formatShortDate(s.created_at)}
                    </span>
                  </div>
                  <span className="text-sm text-theme-secondary">
                    <StudentLinks ids={[s.author_student_id]} people={people} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Свежие доклады</SectionTitle>
          {recentReports.length === 0 ? (
            <EmptyState>Докладов пока нет.</EmptyState>
          ) : (
            <ul
              className={`${card} flex flex-col divide-y-2 divide-theme-cardMuted overflow-hidden`}
            >
              {recentReports.map((r) => (
                <li key={r.slug} className="flex flex-col gap-1 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/reports/${r.slug}`} className="font-bold hover:underline">
                      {r.title}
                    </Link>
                    <span className="ml-auto shrink-0 text-xs text-theme-muted">
                      {formatShortDate(r.created_at)}
                    </span>
                  </div>
                  <span className="text-sm text-theme-secondary">
                    <span className="font-mono text-xs text-theme-muted">{r.library}</span>
                    {r.authorIds.length > 0 && ' · '}
                    <StudentLinks ids={r.authorIds} people={people} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
