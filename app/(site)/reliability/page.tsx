import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { formatDate, plural } from '@/lib/format';
import { getReliability, type SloCard } from '@/lib/reliability';
import {
  WINDOW_DAYS,
  describeBudget,
  formatCount,
  formatPercent,
  type SloStatus,
} from '@/lib/reliability-core';

export const metadata: Metadata = { title: 'Надёжность' };

const STATUS: Record<
  Exclude<SloStatus, 'no-data'>,
  { label: string; tone: 'green' | 'amber' | 'red' }
> = {
  ok: { label: 'в норме', tone: 'green' },
  'at-risk': { label: 'под угрозой', tone: 'amber' },
  violated: { label: 'нарушено', tone: 'red' },
};

function StatusBadge({ card }: { card: SloCard }) {
  const r = card.result;
  if (r.status === 'no-data') return <Badge>нет данных</Badge>;
  if (r.fewEvents)
    return (
      <Badge>
        мало данных: {formatCount(r.total)} {plural(r.total, ['событие', 'события', 'событий'])}
      </Badge>
    );
  const s = STATUS[r.status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function SloItem({ card }: { card: SloCard }) {
  const r = card.result;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-bold">{card.title}</h2>
        <StatusBadge card={card} />
      </div>
      <p className="text-sm text-theme-secondary">{card.goodEvent}</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-3xl font-bold">
          {r.sli === null ? '—' : formatPercent(r.sli)}
        </span>
        <span className="text-sm font-semibold text-theme-muted">
          цель {formatPercent(r.target)}
        </span>
      </p>
      <p className="text-sm">{describeBudget(r)}</p>
      <p className="mt-auto text-xs text-theme-muted">
        {card.since
          ? `Замеры с ${formatDate(card.since)} · событий за окно: ${formatCount(r.total)}`
          : 'Замеров пока нет'}
      </p>
    </Card>
  );
}

export default async function ReliabilityPage() {
  await requireSession();
  const [cards, report] = await Promise.all([
    getReliability(),
    db()
      .from('reports')
      .select('slug, title')
      .eq('status', 'approved')
      .ilike('title', '%SLO%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title="Надёжность">
        <p className="max-w-2xl text-theme-secondary">
          Насколько хорошо работает этот сайт — в цифрах. Для пяти важных вещей у нас есть цель
          (SLO): какая доля событий должна проходить хорошо за последние {WINDOW_DAYS} дней. Бюджет
          ошибок — сколько плохих событий ещё можно себе позволить. Цели предварительные: их
          пересмотрят после месяца замеров.
        </p>
        {report.data && (
          <p className="text-sm">
            Подробнее —{' '}
            <Link
              href={`/reports/${report.data.slug}`}
              className="font-semibold underline decoration-theme-accent decoration-2 underline-offset-2"
            >
              доклад «{report.data.title}»
            </Link>
          </p>
        )}
      </PageHeader>

      <section className="grid gap-5 md:grid-cols-2">
        {cards.map((c) => (
          <SloItem key={c.id} card={c} />
        ))}
      </section>

      <p className="text-xs text-theme-muted">
        Статус: «под угрозой» — потрачено больше половины бюджета, «нарушено» — доля хороших событий
        ниже цели. Пока событий меньше 20, статус не показывается. Здесь только агрегаты: имена, IP
        и тексты запросов не записываются.
      </p>
    </>
  );
}
