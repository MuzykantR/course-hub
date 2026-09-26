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
    <nav aria-label="Разделы" className={cn('flex gap-2', className)}>
      {LINKS.map(({ href, label, match }) => {
        const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-pill border-2 px-4 py-2 text-sm font-bold transition',
              active
                ? 'border-theme-border bg-theme-accent text-theme-accentText shadow-neo-sm'
                : 'border-transparent hover:border-theme-border hover:bg-theme-card',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
