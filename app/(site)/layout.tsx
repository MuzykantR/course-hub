import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { requireSession } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  let studentName: string | undefined;
  if (session.role === 'student' && session.studentId) {
    const { data } = await db()
      .from('students')
      .select('full_name')
      .eq('id', session.studentId)
      .maybeSingle();
    studentName = data?.full_name;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 md:py-10">
      <Header session={session} studentName={studentName} />
      <main className="flex flex-col gap-10">{children}</main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-theme-borderSubtle pt-6 text-sm text-theme-muted">
        <span>Python HSE Hub</span>
        <Link href="/reliability" className="font-semibold hover:text-theme-main hover:underline">
          Надёжность сайта
        </Link>
      </footer>
    </div>
  );
}
