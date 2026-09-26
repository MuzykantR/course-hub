import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Card } from '@/components/ui/Card';
import { getSession } from '@/lib/auth/guards';
import { safeNextPath } from '@/lib/validation/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : undefined);
  if (await getSession()) redirect(nextPath);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-theme-border bg-theme-accent font-mono text-sm font-bold text-theme-accentText shadow-neo-sm">
            py
          </div>
          <p className="font-bold">Python HSE Hub</p>
        </div>
        <ThemeToggle />
      </div>
      <Card size="lg">
        <h1 className="text-2xl font-bold tracking-tight">Вход в курс</h1>
        <p className="mt-1 text-sm text-theme-secondary">
          Пароль курса выдаёт преподаватель на первом занятии.
        </p>
        <LoginForm next={nextPath} />
      </Card>
    </main>
  );
}
