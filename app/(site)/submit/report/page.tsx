import type { Metadata } from 'next';
import { SubmissionBlocked } from '@/components/kb/SubmissionBlocked';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireIdentifiedStudent } from '@/lib/auth/guards';
import { lessonList } from '@/lib/db/queries/content';
import { getPeople } from '@/lib/db/queries/people';
import { submissionPrecheck } from '@/lib/submissions';
import { ReportSubmitForm } from '../ReportSubmitForm';

export const metadata: Metadata = { title: 'Предложить доклад' };

export default async function SubmitReportPage() {
  const { studentId } = await requireIdentifiedStudent('/submit/report');
  const [blocked, people, lessons] = await Promise.all([
    submissionPrecheck(studentId),
    getPeople(),
    lessonList(),
  ]);

  return (
    <>
      <PageHeader eyebrow="Заявка" title="Предложить доклад">
        <p className="max-w-2xl text-theme-secondary">
          Доклад по библиотеке Python в Markdown. После отправки можно добавить до 5 картинок; на
          сайте он появится после проверки преподавателем.
        </p>
      </PageHeader>
      {blocked ? (
        <SubmissionBlocked reason={blocked} />
      ) : (
        <ReportSubmitForm
          meId={studentId}
          groups={people.groups}
          students={people.students}
          lessons={lessons}
        />
      )}
    </>
  );
}
