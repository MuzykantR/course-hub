import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/Table';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { lessonOptions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { ReportForm } from '../ReportForm';

export const metadata: Metadata = { title: 'Новый доклад' };

export default async function NewReportPage() {
  await requireTeacher();
  const [people, lessons] = await Promise.all([getPeople(), lessonOptions()]);
  if (people.groups.length === 0) {
    return (
      <>
        <AdminPageTitle title="Новый доклад" />
        <EmptyState>Сначала добавьте группы и студентов.</EmptyState>
      </>
    );
  }

  return (
    <>
      <AdminPageTitle title="Новый доклад">
        <p className="text-sm text-theme-secondary">
          Картинки можно будет загрузить после сохранения.
        </p>
      </AdminPageTitle>
      <ReportForm
        groups={people.groups}
        students={people.students}
        lessons={lessons}
        report={{
          title: '',
          slug: '',
          library: '',
          summary: '',
          content_md: '',
          group_id: null,
          lesson_id: null,
          tags: [],
          authorIds: [],
          status: 'approved',
          review_comment: null,
        }}
      />
    </>
  );
}
