'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Textarea, checkedOf, valueOf } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import type { GroupRef } from '@/lib/db/queries/people';
import { formKey, initialFormState } from '@/lib/forms';
import { importStudents, saveGroup, saveStudent } from './actions';

export function GroupForm({ group }: { group?: { id: number; name: string; slug: string } }) {
  const [state, action] = useActionState(saveGroup, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <form key={formKey(state)} action={action} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {group && <input type="hidden" name="id" value={group.id} />}
      <Field label="Название группы" htmlFor="group-name" error={fe.name} className="flex-1">
        <Input
          id="group-name"
          name="name"
          required
          maxLength={100}
          defaultValue={valueOf(state, 'name', group?.name)}
        />
      </Field>
      <Field
        label="Адрес (slug)"
        htmlFor="group-slug"
        error={fe.slug}
        hint={group ? undefined : 'Пусто — из названия'}
      >
        <Input
          id="group-slug"
          name="slug"
          pattern="[a-z0-9\-]{1,100}"
          className="font-mono"
          defaultValue={valueOf(state, 'slug', group?.slug)}
        />
      </Field>
      <SubmitButton>{group ? 'Сохранить' : 'Создать группу'}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ImportStudentsForm({ groupId }: { groupId: number }) {
  const [state, action] = useActionState(importStudents, initialFormState);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Добавить студентов списком</h2>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="group_id" value={groupId} />
        <Field
          label="ФИО — по одному в строке"
          htmlFor="names"
          error={state.fieldErrors?.names}
          hint="Можно вставить нумерованный список из таблицы — номера отбросятся. Уже существующие пропустятся."
        >
          <Textarea id="names" name="names" rows={6} placeholder={'Иванова Анна\nПетров Борис'} />
        </Field>
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Добавляем…">Добавить</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function StudentForm({
  student,
  groups,
}: {
  student: {
    id: number;
    full_name: string;
    slug: string;
    group_id: number;
    submissions_blocked: boolean;
  };
  groups: GroupRef[];
}) {
  const [state, action] = useActionState(saveStudent, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={student.id} />
        <Field label="ФИО" htmlFor="full_name" error={fe.full_name}>
          <Input
            id="full_name"
            name="full_name"
            required
            maxLength={200}
            defaultValue={valueOf(state, 'full_name', student.full_name)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Группа" htmlFor="group_id" error={fe.group_id}>
            <Select
              id="group_id"
              name="group_id"
              defaultValue={valueOf(state, 'group_id', student.group_id)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Адрес (slug)" htmlFor="slug" error={fe.slug} hint="Пусто — из ФИО.">
            <Input
              id="slug"
              name="slug"
              pattern="[a-z0-9\-]{1,100}"
              className="font-mono"
              defaultValue={valueOf(state, 'slug', student.slug)}
            />
          </Field>
        </div>
        <Checkbox
          name="submissions_blocked"
          label="Запретить отправку заявок"
          hint="Студент не сможет предлагать решения и доклады."
          defaultChecked={checkedOf(state, 'submissions_blocked', student.submissions_blocked)}
        />
        <FormMessage state={state} />
        <div>
          <SubmitButton>Сохранить</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
