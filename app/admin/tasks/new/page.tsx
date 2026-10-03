import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { lessonOptions, nextTaskOrder } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { TaskForm } from '../TaskForm';

export const metadata: Metadata = { title: 'Новая задача' };

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  await requireTeacher();
  const [{ lesson }, lessons, people] = await Promise.all([
    searchParams,
    lessonOptions(),
    getPeople(),
  ]);
  if (lessons.length === 0) {
    return (
      <>
        <AdminPageTitle title="Новая задача" />
        <EmptyState>Сначала создайте занятие — задача всегда привязана к нему.</EmptyState>
      </>
    );
  }
  const lessonId = lessons.find((l) => String(l.id) === lesson)?.id ?? lessons[0]!.id;

  return (
    <>
      <AdminPageTitle title="Новая задача" />
      <TaskForm
        lessons={lessons}
        groups={people.groups}
        students={people.students}
        task={{
          lesson_id: lessonId,
          order: await nextTaskOrder(lessonId),
          title: '',
          statement_md: '',
          difficulty: 'medium',
          tags: [],
          assigned_student_id: null,
          status: 'draft',
          tests: null,
        }}
      />
    </>
  );
}
