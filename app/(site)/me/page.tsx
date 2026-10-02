import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { StatusPill } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, SectionTitle } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { mySubmissions } from '@/lib/db/queries/me';
import { formatDate } from '@/lib/format';
import { safeNextPath } from '@/lib/validation/auth';
import { withdrawSubmission } from '../submit/actions';
import { forgetIdentity } from './actions';
import { IdentifyForm, type StudentOption } from './IdentifyForm';

export const metadata: Metadata = { title: 'Мои заявки' };

const actionLink =
  'inline-flex h-11 items-center gap-2 rounded-pill border-2 border-theme-border px-5 text-sm font-bold shadow-neo-sm transition hover:-translate-y-0.5';

function Submission({
  title,
  href,
  status,
  comment,
  createdAt,
  withdraw,
  extra,
}: {
  title: string;
  href?: string;
  status: string;
  comment: string | null;
  createdAt: string;
  withdraw?: { kind: 'solution' | 'report'; id: number };
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo-sm">
      <div className="flex flex-wrap items-center gap-2">
        {href ? (
          <Link href={href} className="font-bold hover:underline">
            {title}
          </Link>
        ) : (
          <span className="font-bold">{title}</span>
        )}
        <StatusPill status={status} />
        <span className="ml-auto text-xs text-theme-muted">{formatDate(createdAt)}</span>
      </div>
      {comment && (
        <p className="rounded-xl border-l-4 border-theme-accent bg-theme-cardMuted px-3 py-2 text-sm">
          <span className="font-semibold">Преподаватель: </span>
          {comment}
        </p>
      )}
      {(extra || withdraw) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {extra}
          {withdraw && (
            <ConfirmForm
              action={withdrawSubmission}
              hidden={withdraw}
              confirm="Отозвать заявку? Её можно будет отправить заново."
            >
              <button
                type="submit"
                className="font-semibold text-danger-700 hover:underline dark:text-danger-300"
              >
                Отозвать
              </button>
            </ConfirmForm>
          )}
        </div>
      )}
    </li>
  );
}

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string }>;
}) {
  const session = await requireSession();
  if (session.role === 'teacher') redirect('/admin');
  const { next, sent } = await searchParams;

  if (!session.studentId) {
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
        <IdentifyForm students={students} next={next ? safeNextPath(next) : '/me'} />
      </Card>
    );
  }

  const [{ data: me }, { solutions, reports }] = await Promise.all([
    db()
      .from('students')
      .select('full_name, slug, groups(name)')
      .eq('id', session.studentId)
      .maybeSingle(),
    mySubmissions(session.studentId),
  ]);

  return (
    <>
      <Card size="lg" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">
              Вы вошли как
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {me ? (
                <Link href={`/students/${me.slug}`} className="hover:underline">
                  {me.full_name}
                </Link>
              ) : (
                'Неизвестный студент'
              )}
            </h1>
            {me?.groups && <p className="text-theme-secondary">{me.groups.name}</p>}
          </div>
          <form action={forgetIdentity}>
            <Button variant="ghost" type="submit" className="h-9 px-3 text-xs">
              Это не я
            </Button>
          </form>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/submit/solution"
            className={`${actionLink} bg-theme-accent text-theme-accentText`}
          >
            <Plus className="h-4 w-4" /> Предложить решение
          </Link>
          <Link href="/submit/report" className={`${actionLink} bg-theme-card`}>
            <FileText className="h-4 w-4" /> Предложить доклад
          </Link>
        </div>
      </Card>

      {sent && (
        <p
          role="status"
          className="rounded-xl border-2 border-theme-border bg-success-100 px-4 py-3 text-sm font-medium text-success-900 dark:bg-success-950 dark:text-success-200"
        >
          Заявка отправлена. Она появится на сайте после проверки преподавателем.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle count={solutions.length}>Мои решения</SectionTitle>
        {solutions.length === 0 ? (
          <EmptyState>Вы ещё не отправляли решений.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {solutions.map((s) => (
              <Submission
                key={s.id}
                title={s.task.title}
                href={s.task.status !== 'draft' ? `/tasks/${s.task.id}` : undefined}
                status={s.status}
                comment={s.review_comment}
                createdAt={s.created_at}
                withdraw={s.status === 'pending' ? { kind: 'solution', id: s.id } : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle count={reports.length}>Мои доклады</SectionTitle>
        {reports.length === 0 ? (
          <EmptyState>Вы ещё не отправляли докладов.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <Submission
                key={r.id}
                title={r.title}
                href={r.status === 'approved' ? `/reports/${r.slug}` : undefined}
                status={r.status}
                comment={r.review_comment}
                createdAt={r.created_at}
                withdraw={r.status === 'pending' ? { kind: 'report', id: r.id } : undefined}
                extra={
                  r.status === 'pending' && (
                    <Link href={`/me/reports/${r.id}`} className="font-semibold hover:underline">
                      Картинки и предпросмотр →
                    </Link>
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
