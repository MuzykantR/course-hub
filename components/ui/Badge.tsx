import Link from 'next/link';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'green' | 'red' | 'amber' | 'blue';

// Status reads from a small colored dot on a neutral pill; only `accent` fills with lime.
const DOTS: Partial<Record<Tone, string>> = {
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  amber: 'bg-amber-400',
  blue: 'bg-sky-500',
};

const base =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border-2 border-theme-border px-2.5 py-0.5 text-xs font-bold';

export function StatusDot({ tone }: { tone: Tone }) {
  const dot = DOTS[tone];
  return dot ? <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', dot)} /> : null;
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        base,
        tone === 'accent'
          ? 'bg-theme-accent text-theme-accentText'
          : 'bg-theme-card text-theme-main',
        className,
      )}
      {...props}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

export function TagLink({ tag, href }: { tag: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        'border-transparent bg-theme-cardMuted font-mono font-semibold hover:border-theme-border',
      )}
    >
      #{tag}
    </Link>
  );
}

const DIFFICULTY: Record<string, { label: string; tone: Tone }> = {
  easy: { label: 'Лёгкая', tone: 'green' },
  medium: { label: 'Средняя', tone: 'amber' },
  hard: { label: 'Сложная', tone: 'red' },
};

export function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  const d = difficulty ? DIFFICULTY[difficulty] : undefined;
  return d ? <Badge tone={d.tone}>{d.label}</Badge> : null;
}

export function TypeBadge({ type }: { type: 'task' | 'report' }) {
  return type === 'task' ? <Badge>Задача</Badge> : <Badge tone="accent">Доклад</Badge>;
}
