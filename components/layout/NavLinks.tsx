'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/kb', label: 'База знаний', match: ['/kb', '/tasks', '/reports'] },
  { href: '/lessons', label: 'Занятия', match: ['/lessons'] },
  { href: '/groups', label: 'Группы', match: ['/groups', '/students'] },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Разделы"
      className={cn(
        'flex w-fit gap-1 rounded-pill border-2 border-theme-border bg-theme-card p-1 backdrop-blur',
        className,
      )}
    >
      {LINKS.map(({ href, label, match }) => {
        const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-pill px-4 py-1.5 text-sm transition',
              active
                ? 'bg-theme-accent font-bold text-theme-accentText'
                : 'font-semibold hover:bg-theme-cardMuted',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
