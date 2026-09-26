import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireSession } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { forgetIdentity } from './actions';
import { IdentifyForm, type StudentOption } from './IdentifyForm';

export const metadata: Metadata = { title: 'Кто я' };

export default async function MePage() {
  const session = await requireSession();
  if (session.role === 'teacher') redirect('/admin');

  if (session.studentId) {
    const { data: me } = await db()
      .from('students')
      .select('full_name, groups(name)')
      .eq('id', session.studentId)
      .maybeSingle();
    return (
      <Card size="lg" className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">Вы вошли как</p>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {me?.full_name ?? 'Неизвестный студент'}
          </h1>
          {me?.groups && <p className="text-theme-secondary">{me.groups.name}</p>}
        </div>
        <p className="text-sm text-theme-secondary">
          Здесь появятся ваши заявки: решения и доклады, отправленные на проверку.
        </p>
        <form action={forgetIdentity}>
          <Button variant="secondary" type="submit">
            Это не я
          </Button>
        </form>
      </Card>
    );
  }

  const { data: rows, error } = await db()
    .from('students')
    .select('id, full_name, pin_hash, groups(name)')
    .order('full_name');
  if (error) throw new Error(error.message);
  // Only whether a PIN exists leaves the server — never the hash itself.
  const students: StudentOption[] = rows.map((s) => ({
    id: s.id,
    name: s.full_name,
    group: s.groups?.name ?? '—',
    hasPin: s.pin_hash !== null,
  }));

  return (
    <Card size="lg" className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Кто вы?</h1>
      <p className="mt-1 text-sm text-theme-secondary">
        Чтобы предлагать решения и доклады, выберите себя в списке. В первый раз придумайте PIN из
        4–6 цифр — он защищает от отправки под вашим именем.
      </p>
      <IdentifyForm students={students} />
    </Card>
  );
}
