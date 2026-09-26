import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { Header } from '@/components/layout/Header';
import { requireTeacher } from '@/lib/auth/guards';

export const metadata: Metadata = { title: { default: 'Админка', template: '%s · Админка' } };

// Layouts aren't re-run on every client navigation, so each admin page and action must also
// call requireTeacher() itself; this guard only covers the first render.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTeacher();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:py-10">
      <Header session={session} />
      <AdminNav />
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  );
}
