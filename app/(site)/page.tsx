import Link from 'next/link';
import { ArrowRight, Presentation } from 'lucide-react';
import { StudentLinks } from '@/components/kb/People';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { getHomeData } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { formatDate, formatShortDate, plural } from '@/lib/format';

const card = 'rounded-card border-2 border-theme-border bg-theme-card shadow-neo backdrop-blur';

export default async function Home() {
  await requireSession();
  const [{ counts, recentSolutions, recentReports, latestLesson }, people] = await Promise.all([
    getHomeData(),
    getPeople(),
  ]);

  const stats: { forms: [string, string, string]; value: number; href: string }[] = [
    { forms: ['занятие', 'занятия', 'занятий'], value: counts.lessons, href: '/lessons' },
    { forms: ['задача', 'задачи', 'задач'], value: counts.tasks, href: '/kb?type=task' },
    { forms: ['решение', 'решения', 'решений'], value: counts.solutions, href: '/kb?type=task' },
    { forms: ['доклад', 'доклада', 'докладов'], value: counts.reports, href: '/kb?type=report' },
  ];

  return (
    <>
      <section className="flex flex-col gap-6 rounded-card-lg border-2 border-theme-border bg-theme-card p-6 shadow-neo-lg backdrop-blur md:p-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Python HSE Hub</h1>
          <p className="mt-3 max-w-2xl text-theme-secondary">
            Занятия, задачи с семинаров, решения студентов и доклады по библиотекам — в одной базе
            знаний с поиском и фильтрами.
          </p>
        </div>
        {latestLesson && (
          <Link
            href={`/lessons/${latestLesson.id}`}
            className="group flex flex-col gap-1 rounded-card border-2 border-theme-border bg-theme-accent p-5 text-theme-accentText shadow-neo transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-widest opacity-70">
                Последнее занятие · {formatDate(latestLesson.date)}
              </span>
              <span className="text-lg font-bold">
                {latestLesson.number}. {latestLesson.title}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.href + s.forms[0]}
            href={s.href}
            className={`${card} p-5 transition hover:-translate-y-0.5`}
          >
            <span className="block font-mono text-3xl font-bold">{s.value}</span>
            <span className="text-sm font-semibold text-theme-secondary">
              {plural(s.value, s.forms)}
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle>Свежие решения</SectionTitle>
          {recentSolutions.length === 0 ? (
            <EmptyState>Решений пока нет.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentSolutions.map((s) => (
                <li key={s.id} className={`${card} flex flex-col gap-1 p-4`}>
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
            <ul className="flex flex-col gap-3">
              {recentReports.map((r) => (
                <li key={r.slug} className={`${card} flex flex-col gap-1 p-4`}>
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
