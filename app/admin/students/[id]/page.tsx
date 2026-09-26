import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { requireTeacher } from '@/lib/auth/guards';
import { adminStudent } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { parseIdParam } from '@/lib/validation/params';
import { deleteStudent } from '../../groups/actions';
import { StudentForm } from '../../groups/Forms';

export const metadata: Metadata = { title: 'Студент' };

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const [student, people] = await Promise.all([adminStudent(id), getPeople()]);
  if (!student) notFound();
  const group = people.groupById.get(student.group_id);

  return (
    <>
      <AdminPageTitle title={student.full_name}>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-theme-secondary">
          {group && (
            <Link href={`/admin/groups/${group.id}`} className="hover:underline">
              ← {group.name}
            </Link>
          )}
          <Link
            href={`/students/${student.slug}`}
            className="inline-flex items-center gap-1 hover:underline"
          >
            Страница на сайте <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </AdminPageTitle>
      <StudentForm student={student} groups={people.groups} />
      <ConfirmForm
        action={deleteStudent}
        hidden={{ id: student.id }}
        confirm={`Удалить студента ${student.full_name} вместе с его решениями и авторством докладов? Это необратимо.`}
        className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
      >
        <Button type="submit" variant="secondary" className="text-rose-700 dark:text-rose-300">
          Удалить студента
        </Button>
      </ConfirmForm>
    </>
  );
}
