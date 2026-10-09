import 'server-only';
import { db } from '@/lib/db/client';
import {
  PAGE_FAST_MS,
  SEARCH_FAST_MS,
  WINDOW_MS,
  evaluateSlo,
  healthSlo,
  moderationCounts,
  type SloResult,
} from '@/lib/reliability-core';

export type SloCard = {
  id: 'health' | 'errors' | 'latency' | 'search' | 'moderation';
  title: string;
  goodEvent: string;
  result: SloResult;
  /** When measurements for this SLO began (ISO), if they have. */
  since: string | null;
};

type CountRes = { count: number | null; error: { message: string } | null };
const count = (res: CountRes, what: string) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.count ?? 0;
};

/** Current SLI/SLO state for the «Надёжность» page. Aggregates only. */
export async function getReliability(now = Date.now()): Promise<SloCard[]> {
  const since = new Date(now - WINDOW_MS).toISOString();
  const metrics = () =>
    db().from('page_metrics').select('id', { count: 'exact', head: true }).gte('created_at', since);

  const [
    health,
    firstHealth,
    pagesAll,
    pagesOk,
    pagesOnly,
    pagesFast,
    searches,
    searchesFast,
    firstMetric,
    submits,
  ] = await Promise.all([
    db()
      .from('health_checks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    db().from('health_checks').select('created_at').order('created_at').limit(1).maybeSingle(),
    metrics(),
    metrics().eq('ok', true),
    metrics().eq('kind', 'page'),
    metrics().eq('kind', 'page').eq('ok', true).lt('duration_ms', PAGE_FAST_MS),
    metrics().eq('kind', 'search'),
    metrics().eq('kind', 'search').eq('ok', true).lt('duration_ms', SEARCH_FAST_MS),
    db().from('page_metrics').select('created_at').order('created_at').limit(1).maybeSingle(),
    // Student submissions only (teacher-created content is published directly, not moderated).
    db()
      .from('audit_log')
      .select('entity, entity_id, created_at')
      .in('action', ['solution.submit', 'report.submit'])
      .order('created_at'),
  ]);
  for (const r of [firstHealth, firstMetric, submits])
    if (r.error) throw new Error(r.error.message);

  const ids = (entity: string) =>
    (submits.data ?? [])
      .filter((s) => s.entity === entity && s.entity_id && s.created_at >= since)
      .map((s) => Number(s.entity_id));
  type Reviewed = { status: string; created_at: string; reviewed_at: string | null };
  const reviewed = async (table: 'solutions' | 'reports', list: number[]): Promise<Reviewed[]> => {
    if (list.length === 0) return [];
    const res = await db().from(table).select('status, created_at, reviewed_at').in('id', list);
    if (res.error) throw new Error(`${table}: ${res.error.message}`);
    return res.data;
  };
  const [solutions, reports] = await Promise.all([
    reviewed('solutions', ids('solution')),
    reviewed('reports', ids('report')),
  ]);
  const moderation = moderationCounts(
    [...solutions, ...reports].map((r) => ({
      createdAt: Date.parse(r.created_at),
      reviewedAt: r.reviewed_at ? Date.parse(r.reviewed_at) : null,
      pending: r.status === 'pending',
    })),
    now,
  );

  const firstHealthAt = firstHealth.data?.created_at ?? null;
  const metricsSince = firstMetric.data?.created_at ?? null;
  const total = count(pagesAll, 'page metrics');

  return [
    {
      id: 'health',
      title: 'Сайт отвечает',
      goodEvent: 'Проверка раз в 5 минут прошла: сайт ответил, база доступна',
      result: healthSlo(
        count(health, 'health checks'),
        firstHealthAt ? Date.parse(firstHealthAt) : null,
        now,
        0.995,
      ),
      since: firstHealthAt,
    },
    {
      id: 'errors',
      title: 'Страницы без ошибок',
      goodEvent: 'Открытие страницы или поиска прошло без ошибки сервера',
      result: evaluateSlo(count(pagesOk, 'ok pages'), total, 0.99),
      since: metricsSince,
    },
    {
      id: 'latency',
      title: 'Страницы быстрее 1,5 с',
      goodEvent: 'Страница собрана на сервере быстрее 1,5 секунды',
      result: evaluateSlo(count(pagesFast, 'fast pages'), count(pagesOnly, 'pages'), 0.95),
      since: metricsSince,
    },
    {
      id: 'search',
      title: 'Поиск быстрее 1 с',
      goodEvent: 'Поиск в базе знаний выполнен быстрее 1 секунды',
      result: evaluateSlo(count(searchesFast, 'fast searches'), count(searches, 'searches'), 0.95),
      since: metricsSince,
    },
    {
      id: 'moderation',
      title: 'Модерация за 72 ч',
      goodEvent: 'Заявка на решение или доклад рассмотрена за 72 часа',
      result: evaluateSlo(moderation.good, moderation.total, 0.9),
      since: submits.data?.[0]?.created_at ?? null,
    },
  ];
}
