import type { Metadata } from 'next';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireTeacher } from '@/lib/auth/guards';
import { getSettings } from '@/lib/db/settings';
import { env } from '@/lib/env';
import { exportConfigured } from '@/lib/github/export';
import { formatDate } from '@/lib/format';
import { logoutAllStudents } from './actions';
import { CoursePasswordForm, ExportNowForm, TogglesForm } from './Forms';

export const metadata: Metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  await requireTeacher();
  const settings = await getSettings();
  const configured = exportConfigured();

  return (
    <>
      <AdminPageTitle title="Настройки">
        <p className="text-sm text-theme-muted">
          Последнее изменение: {formatDate(settings.updated_at)}
        </p>
      </AdminPageTitle>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">Пароль курса</h2>
          <p className="text-sm text-theme-secondary">
            Общий пароль для входа студентов. После смены все студенты выйдут и войдут с новым.
            Пароль преподавателя задаётся в переменных окружения.
          </p>
        </div>
        <CoursePasswordForm />
        <ConfirmForm
          action={logoutAllStudents}
          confirm="Разлогинить всех студентов? Пароль не изменится."
          className="border-t-2 border-dashed border-theme-borderSubtle pt-4"
        >
          <Button type="submit" variant="secondary">
            Разлогинить всех студентов
          </Button>
        </ConfirmForm>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Заявки и экспорт</h2>
        <TogglesForm
          submissionsOpen={settings.submissions_open}
          githubExport={settings.github_export_enabled}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">Экспорт в GitHub</h2>
          <p className="text-sm text-theme-secondary">
            После каждой публикации репозиторий курса пересобирается из опубликованных материалов:
            занятия по датам, условия задач, решения (.py), доклады с картинками и README с
            оглавлением. В репозиторий попадают ФИО авторов — держите его приватным или договоритесь
            со студентами.
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-theme-muted">Репозиторий</dt>
          <dd className="font-mono">
            {configured
              ? `${env().GITHUB_EXPORT_REPO} · ${env().GITHUB_EXPORT_BRANCH}`
              : 'не настроен'}
          </dd>
          <dt className="font-semibold text-theme-muted">Последний экспорт</dt>
          <dd>
            {settings.github_last_export_at ? (
              <>
                <span
                  className={
                    settings.github_last_export_ok
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }
                >
                  {settings.github_last_export_ok ? '✓' : '✗'} {settings.github_last_export_message}
                </span>{' '}
                <span className="text-theme-muted">
                  (
                  {new Date(settings.github_last_export_at).toLocaleString('ru-RU', {
                    timeZone: 'Europe/Moscow',
                  })}
                  )
                </span>
              </>
            ) : (
              'ещё не было'
            )}
          </dd>
          {settings.github_last_commit_url && (
            <>
              <dt className="font-semibold text-theme-muted">Последний коммит</dt>
              <dd>
                <a
                  href={settings.github_last_commit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  открыть на GitHub
                </a>
              </dd>
            </>
          )}
        </dl>
        <ExportNowForm disabled={!configured} />
      </Card>
    </>
  );
}
