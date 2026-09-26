import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusPill } from '@/components/admin/Table';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { AssetManager } from '@/components/reports/AssetManager';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireIdentifiedStudent } from '@/lib/auth/guards';
import { myReport } from '@/lib/db/queries/me';
import { parseIdParam } from '@/lib/validation/params';
import { deleteOwnReportImage, uploadOwnReportImage } from '../../../submit/actions';

export const metadata: Metadata = { title: 'Мой доклад' };

export default async function MyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const id = parseIdParam((await params).id);
  const { studentId } = await requireIdentifiedStudent(`/me/reports/${id}`);
  const [report, { sent }] = await Promise.all([myReport(studentId, id), searchParams]);
  if (!report) notFound();

  return (
    <>
      <PageHeader
        back={{ href: '/me', label: 'Мои заявки' }}
        eyebrow={report.library}
        title={report.title}
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={report.status} />
          {report.status === 'approved' && (
            <Link
              href={`/reports/${report.slug}`}
              className="text-sm font-semibold hover:underline"
            >
              Открыть на сайте →
            </Link>
          )}
        </div>
      </PageHeader>

      {sent && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Доклад отправлен на проверку. Если в тексте есть картинки — загрузите их ниже.
        </p>
      )}
      {report.review_comment && (
        <p className="rounded-xl border-l-4 border-theme-accent bg-theme-cardMuted px-4 py-3 text-sm">
          <span className="font-semibold">Преподаватель: </span>
          {report.review_comment}
        </p>
      )}

      {report.status === 'pending' && (
        <AssetManager
          reportId={report.id}
          assets={report.assets}
          uploadAction={uploadOwnReportImage}
          deleteAction={deleteOwnReportImage}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Предпросмотр</h2>
        <Card size="lg">
          <MarkdownContent
            source={report.content_md}
            assetBase={`/api/assets/reports/${report.id}`}
          />
        </Card>
      </section>
    </>
  );
}
