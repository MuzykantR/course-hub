import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/Table';
import { requireTeacher } from '@/lib/auth/guards';
import { nextLessonNumber } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { LessonForm } from '../LessonForm';

export const metadata: Metadata = { title: 'Новое занятие' };

export default async function NewLessonPage() {
  await requireTeacher();
  const [people, number] = await Promise.all([getPeople(), nextLessonNumber()]);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });

  return (
    <>
      <AdminPageTitle title="Новое занятие" />
      <LessonForm
        groups={people.groups}
        lesson={{
          date: today,
          number,
          title: '',
          description_md: '',
          groupIds: people.groups.map((g) => g.id),
        }}
      />
    </>
  );
}
