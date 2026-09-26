import { Card } from '@/components/ui/Card';
import { requireTeacher } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';

export default async function AdminHome() {
  await requireTeacher();
  const { data: recent, error } = await db()
    .from('audit_log')
    .select('id, actor, action, entity, entity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);

  return (
    <>
      <Card size="lg">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Панель преподавателя</h1>
        <p className="mt-1 text-theme-secondary">
          Очередь модерации и управление курсом появятся на следующих этапах.
        </p>
      </Card>
      <Card>
        <h2 className="font-bold">Последние действия</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-theme-muted">Пока пусто.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {recent.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 font-mono">
                <span className="text-theme-muted">
                  {new Date(e.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                </span>
                <span>{e.actor}</span>
                <span className="font-bold">{e.action}</span>
                <span className="text-theme-secondary">
                  {e.entity}
                  {e.entity_id ? `#${e.entity_id}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
