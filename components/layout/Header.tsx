import Link from 'next/link';
import { LogOut, UserRound } from 'lucide-react';
import { logout } from '@/app/login/actions';
import type { Session } from '@/lib/auth/token';
import { ThemeToggle } from './ThemeToggle';

const iconButton =
  'flex h-10 w-10 items-center justify-center rounded-full border-2 border-theme-border bg-theme-card shadow-neo-sm transition hover:-translate-y-0.5 hover:bg-theme-cardHover';

export function Header({ session, studentName }: { session: Session; studentName?: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-theme-border bg-theme-accent font-mono text-sm font-bold text-theme-accentText shadow-neo-sm">
          py
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">Курс</p>
          <p className="font-bold">Python HSE Hub</p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        {session.role === 'teacher' ? (
          <Link
            href="/admin"
            className="rounded-pill border-2 border-theme-border bg-theme-accent px-4 py-2 text-sm font-bold text-theme-accentText shadow-neo-sm"
          >
            Админка
          </Link>
        ) : (
          <Link
            href="/me"
            className="flex h-10 max-w-[12rem] items-center gap-2 rounded-pill border-2 border-theme-border bg-theme-card px-3 text-sm font-bold shadow-neo-sm transition hover:-translate-y-0.5"
          >
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{studentName ?? 'Кто я?'}</span>
          </Link>
        )}
        <ThemeToggle />
        <form action={logout}>
          <button type="submit" aria-label="Выйти" className={iconButton}>
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
