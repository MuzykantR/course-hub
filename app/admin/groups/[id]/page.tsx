import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KeyRound, LayoutGrid } from 'lucide-react';
import { ConfirmForm } from '@/components/admin/FormBits';
import { AdminPageTitle, AdminTable } from '@/components/admin/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/PageHeader';
import { requireTeacher } from '@/lib/auth/guards';
import { adminGroupStudents } from '@/lib/db/queries/admin';
import { getPeople } from '@/lib/db/queries/people';
import { formatLockTime } from '@/lib/auth/pin';
import { parseIdParam } from '@/lib/validation/params';
import { deleteGroup, resetPin, toggleSubmissions } from '../actions';
import { GroupForm, ImportStudentsForm } from '../Forms';

export const metadata: Metadata = { title: 'Группа' };

const smallButton =
  'rounded-pill border-2 border-theme-border/40 bg-theme-card px-3 py-1 text-xs font-bold hover:border-theme-border';

export default async function AdminGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const id = parseIdParam((await params).id);
  const people = await getPeople();
  const group = people.groupById.get(id);
  if (!group) notFound();
  const students = await adminGroupStudents(id);
  const now = Date.now();

  return (
    <>
      <AdminPageTitle title={group.name}>
        <Link
          href={`/admin/groups/${id}/overview`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-theme-secondary hover:underline"
        >
          <LayoutGrid className="h-4 w-4" /> Обзор группы: студенты × задачи
        </Link>
      </AdminPageTitle>

      <Card>
        <GroupForm group={group} />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Студенты · {students.length}</h2>
        {students.length === 0 ? (
          <EmptyState>В группе пока нет студентов.</EmptyState>
        ) : (
          <AdminTable head={['ФИО', 'PIN', 'Заявки', '']}>
            {students.map((s) => {
              const locked = s.pin_locked_until && new Date(s.pin_locked_until).getTime() > now;
              return (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/students/${s.id}`} className="font-bold hover:underline">
                      {s.full_name}
                    </Link>
                  </td>
                  <td>
                    {locked ? (
                      <Badge tone="red">
                        Заблокирован до {formatLockTime(s.pin_locked_until!)}
                      </Badge>
                    ) : s.hasPin ? (
                      <Badge tone="green">Задан</Badge>
                    ) : (
                      <Badge>Нет</Badge>
                    )}
                  </td>
                  <td>
                    {s.submissions_blocked ? (
                      <Badge tone="red">Запрещены</Badge>
                    ) : (
                      <Badge tone="green">Разрешены</Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      {(s.hasPin || locked) && (
                        <ConfirmForm
                          action={resetPin}
                          hidden={{ id: s.id }}
                          confirm={`Сбросить PIN студента ${s.full_name}? Он сможет задать новый, а текущие входы под его именем отвяжутся.`}
                        >
                          <button type="submit" className={smallButton}>
                            <KeyRound className="mr-1 inline h-3 w-3" />
                            Сбросить PIN
                          </button>
                        </ConfirmForm>
                      )}
                      <form action={toggleSubmissions}>
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="hidden"
                          name="blocked"
                          value={s.submissions_blocked ? 'false' : 'true'}
                        />
                        <button type="submit" className={smallButton}>
                          {s.submissions_blocked ? 'Разрешить заявки' : 'Запретить заявки'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>

      <ImportStudentsForm groupId={id} />

      {students.length === 0 && (
        <ConfirmForm
          action={deleteGroup}
          hidden={{ id }}
          confirm={`Удалить группу «${group.name}»?`}
          className="border-t-2 border-dashed border-theme-borderSubtle pt-6"
        >
          <Button type="submit" variant="secondary" className="text-danger-700 dark:text-danger-300">
            Удалить группу
          </Button>
        </ConfirmForm>
      )}
    </>
  );
}
