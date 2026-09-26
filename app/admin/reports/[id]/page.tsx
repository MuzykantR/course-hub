import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle, StatusPill } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { requireTeacher } from '@/lib/auth/guards';
import { adminReport, lessonOptions } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { parseIdParam } from '@/lib/validation/params';
import { deleteReport } from '../actions';
import { AssetManager } from '../AssetManager';
import { ReportForm } from '../ReportForm';

export const metadata: Metadata = { title: 'Доклад' };

export default async function EditReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const [report, people, lessons, { saved }] = await Promise.all([
    adminReport(id),
    getPeople(),
    lessonOptions(),
    searchParams,
  ]);
  if (!report) notFound();

  return (
    <>
      <AdminPageTitle title={report.title}>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-theme-secondary">
          <StatusPill status={report.status} />
          {report.status === 'approved' && (
            <Link
              href={`/reports/${report.slug}`}
              className="inline-flex items-center gap-1 hover:underline"
            >
              Открыть на сайте <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </AdminPageTitle>
      {saved && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Сохранено.
        </p>
      )}
      <AssetManager reportId={report.id} assets={report.assets} />
      <ReportForm
        report={report}
        groups={people.groups}
        students={people.students}
        lessons={lessons}
      />
      <ConfirmForm
        action={deleteReport}
        hidden={{ id: report.id }}
        confirm={`Удалить доклад «${report.title}» вместе с картинками? Это необратимо.`}
        className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
      >
        <Button type="submit" variant="secondary" className="text-rose-700 dark:text-rose-300">
          Удалить доклад
        </Button>
      </ConfirmForm>
    </>
  );
}
