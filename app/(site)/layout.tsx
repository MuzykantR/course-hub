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
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-6 md:py-10">
      <Header session={session} studentName={studentName} />
      <main className="flex flex-col gap-10">{children}</main>
    </div>
  );
}
