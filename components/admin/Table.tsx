import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function AdminTable({
  head,
  children,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border-2 border-theme-border bg-theme-card shadow-neo">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="bg-theme-cardMuted text-left">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-theme-borderSubtle [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPageTitle({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {children}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-11 items-center gap-2 rounded-pill border-2 border-theme-border bg-theme-accent px-5 text-sm font-bold text-theme-accentText shadow-neo-sm transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; tone: 'neutral' | 'green' | 'red' | 'amber' | 'blue' }
  > = {
    draft: { label: 'Черновик', tone: 'neutral' },
    assigned: { label: 'Назначена', tone: 'blue' },
    solved: { label: 'Решена', tone: 'green' },
    pending: { label: 'На модерации', tone: 'amber' },
    approved: { label: 'Одобрено', tone: 'green' },
    rejected: { label: 'Отклонено', tone: 'red' },
  };
  const s = map[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function FilterLinks({
  options,
  current,
  hrefFor,
}: {
  options: { value: string | undefined; label: string }[];
  current: string | undefined;
  hrefFor: (value: string | undefined) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Link
          key={o.label}
          href={hrefFor(o.value)}
          aria-current={o.value === current ? 'true' : undefined}
          className={cn(
            'rounded-pill border-2 px-3 py-1 text-xs font-bold',
            o.value === current
              ? 'border-theme-border bg-theme-accent text-theme-accentText'
              : 'border-theme-border/30 bg-theme-card hover:border-theme-border',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
