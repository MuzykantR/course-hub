import Link from 'next/link';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'green' | 'red' | 'amber' | 'blue';

const tones: Record<Tone, string> = {
  neutral: 'bg-theme-card text-theme-main',
  accent: 'bg-theme-accent text-theme-accentText',
  green: 'bg-success-300 text-success-950 dark:bg-success-900 dark:text-success-100',
  red: 'bg-danger-300 text-danger-950 dark:bg-danger-950 dark:text-danger-100',
  amber: 'bg-warning-300 text-warning-950 dark:bg-warning-900 dark:text-warning-100',
  blue: 'bg-info-300 text-info-950 dark:bg-info-900 dark:text-info-100',
};

const base =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-pill border-2 border-theme-border px-2.5 py-0.5 text-xs font-bold';

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn(base, tones[tone], className)} {...props} />;
}

export function TagLink({ tag, href }: { tag: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        'border-theme-border/40 bg-theme-cardMuted font-mono font-semibold hover:border-theme-border',
      )}
    >
      #{tag}
    </Link>
  );
}

const VERDICTS: Record<string, { label: string; tone: Tone }> = {
  accepted: { label: 'Accepted', tone: 'green' },
  wrong_answer: { label: 'Wrong Answer', tone: 'red' },
  tle: { label: 'Time Limit', tone: 'amber' },
  runtime_error: { label: 'Runtime Error', tone: 'red' },
  not_checked: { label: 'Не проверено', tone: 'neutral' },
};

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  const v = VERDICTS[verdict ?? 'not_checked'] ?? VERDICTS.not_checked!;
  return <Badge tone={v.tone}>{v.label}</Badge>;
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
  return type === 'task' ? <Badge tone="blue">Задача</Badge> : <Badge tone="accent">Доклад</Badge>;
}
