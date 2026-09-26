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
    <nav aria-label="Админка" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-pill border-2 px-4 py-2 text-sm font-bold transition',
              active
                ? 'border-theme-border bg-theme-main text-theme-base shadow-neo-sm'
                : 'border-theme-border/30 bg-theme-card hover:border-theme-border',
            )}
          >
            {label}
            {href === '/admin/moderation' && pending > 0 && (
              <span className="ml-1.5 rounded-pill bg-theme-accent px-1.5 text-xs text-theme-accentText">
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
