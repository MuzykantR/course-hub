import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { dashboardCounts } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';

const ACTION_LABELS: Record<string, string> = {
  login: 'вход',
  'pin.set': 'задал PIN',
  'pin.locked': 'PIN заблокирован',
  'lesson.create': 'создал занятие',
  'lesson.update': 'изменил занятие',
  'lesson.delete': 'удалил занятие',
  'task.create': 'создал задачу',
  'task.update': 'изменил задачу',
  'task.delete': 'удалил задачу',
  'solution.create': 'добавил решение',
  'solution.update': 'изменил решение',
  'solution.delete': 'удалил решение',
  'report.create': 'создал доклад',
  'report.update': 'изменил доклад',
  'report.delete': 'удалил доклад',
  'report.asset.upload': 'загрузил картинку',
  'report.asset.delete': 'удалил картинку',
  'group.create': 'создал группу',
  'group.update': 'изменил группу',
  'group.delete': 'удалил группу',
  'student.import': 'добавил студентов',
  'student.update': 'изменил студента',
  'student.delete': 'удалил студента',
  'student.pin_reset': 'сбросил PIN',
  'student.block': 'запретил заявки',
  'student.unblock': 'разрешил заявки',
  'settings.course_password': 'сменил пароль курса',
  'settings.logout_students': 'разлогинил студентов',
  'settings.update': 'изменил настройки',
};

export default async function AdminHome() {
  await requireTeacher();
  const [counts, people, recentRes] = await Promise.all([
    dashboardCounts(),
    getPeople(),
    db()
      .from('audit_log')
      .select('id, actor, action, entity, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);
  if (recentRes.error) throw new Error(recentRes.error.message);

  const tiles = [
    {
      label: 'решений ждут',
      value: counts.pendingSolutions,
      href: '/admin/solutions?status=pending',
      hot: counts.pendingSolutions > 0,
    },
    {
      label: 'докладов ждут',
      value: counts.pendingReports,
      href: '/admin/reports?status=pending',
      hot: counts.pendingReports > 0,
    },
    {
      label: 'черновиков задач',
      value: counts.drafts,
      href: '/admin/tasks?status=draft',
      hot: false,
    },
    { label: 'студентов', value: counts.students, href: '/admin/groups', hot: false },
  ];
  const actorName = (actor: string) => {
    const m = /^student:(\d+)$/.exec(actor);
    return m
      ? (people.studentById.get(Number(m[1]))?.name ?? actor)
      : actor === 'teacher'
        ? 'Преподаватель'
        : 'Аноним';
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Панель преподавателя</h1>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-card border-2 border-theme-border p-5 shadow-neo transition hover:-translate-y-0.5 ${
              t.hot ? 'bg-theme-accent text-theme-accentText' : 'bg-theme-card'
            }`}
          >
            <span className="block font-mono text-3xl font-bold">{t.value}</span>
            <span className="text-sm font-semibold">{t.label}</span>
          </Link>
        ))}
      </section>

      <Card>
        <h2 className="font-bold">Последние действия</h2>
        {recentRes.data.length === 0 ? (
          <p className="mt-2 text-sm text-theme-muted">Пока пусто.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-theme-borderSubtle text-sm">
            {recentRes.data.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 py-2">
                <span className="w-36 shrink-0 font-mono text-xs text-theme-muted">
                  {new Date(e.created_at).toLocaleString('ru-RU', {
                    timeZone: 'Europe/Moscow',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="font-semibold">{actorName(e.actor)}</span>
                <span className="text-theme-secondary">{ACTION_LABELS[e.action] ?? e.action}</span>
                {e.entity_id && (
                  <span className="text-theme-muted">
                    {e.entity} #{e.entity_id}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
