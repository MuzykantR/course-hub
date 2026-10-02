'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/admin', label: 'Обзор', exact: true },
  { href: '/admin/moderation', label: 'Модерация' },
  { href: '/admin/lessons', label: 'Занятия' },
  { href: '/admin/tasks', label: 'Задачи' },
  { href: '/admin/solutions', label: 'Решения' },
  { href: '/admin/reports', label: 'Доклады' },
  { href: '/admin/groups', label: 'Группы и студенты' },
  { href: '/admin/settings', label: 'Настройки' },
];

export function AdminNav({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Админка"
      className="flex max-w-full gap-1 self-start overflow-x-auto rounded-pill border-2 border-theme-border bg-theme-card p-1 backdrop-blur"
    >
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center whitespace-nowrap rounded-pill px-3.5 py-1.5 text-sm transition',
              active
                ? 'bg-theme-accent font-bold text-theme-accentText'
                : 'font-semibold hover:bg-theme-cardMuted',
            )}
          >
            {label}
            {href === '/admin/moderation' && pending > 0 && (
              <span className="ml-1.5 rounded-pill bg-theme-main px-1.5 text-xs font-bold text-theme-base">
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
