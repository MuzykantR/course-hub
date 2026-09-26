import type { Metadata } from 'next';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle } from '@/components/admin/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireTeacher } from '@/lib/auth/guards';
import { getSettings } from '@/lib/db/settings';
import { formatDate } from '@/lib/format';
import { logoutAllStudents } from './actions';
import { CoursePasswordForm, TogglesForm } from './Forms';

export const metadata: Metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  await requireTeacher();
  const settings = await getSettings();

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
    </>
  );
}
