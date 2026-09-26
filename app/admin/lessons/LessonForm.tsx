'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Textarea, valueOf, valuesOf } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { formKey, initialFormState } from '@/lib/forms';
import type { GroupRef } from '@/lib/db/queries/people';
import { saveLesson } from './actions';

export type LessonFormValues = {
  id?: number;
  date: string;
  number: number;
  title: string;
  description_md: string;
  groupIds: number[];
};

export function LessonForm({ lesson, groups }: { lesson: LessonFormValues; groups: GroupRef[] }) {
  const [state, action] = useActionState(saveLesson, initialFormState);
  const fe = state.fieldErrors ?? {};
  const selectedGroups = valuesOf(state, 'groupIds', lesson.groupIds);

  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="flex flex-col gap-5">
        {lesson.id && <input type="hidden" name="id" value={lesson.id} />}
        <div className="grid gap-4 sm:grid-cols-[10rem_7rem_1fr]">
          <Field label="Дата" htmlFor="date" error={fe.date}>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={valueOf(state, 'date', lesson.date)}
            />
          </Field>
          <Field label="Номер" htmlFor="number" error={fe.number}>
            <Input
              id="number"
              name="number"
              type="number"
              min={1}
              max={999}
              required
              defaultValue={valueOf(state, 'number', lesson.number)}
            />
          </Field>
          <Field label="Тема" htmlFor="title" error={fe.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={valueOf(state, 'title', lesson.title)}
            />
          </Field>
        </div>

        <Field
          label="Группы"
          error={fe.groupIds}
          hint="Одно занятие может проходить у нескольких групп."
        >
          <div className="flex flex-wrap gap-4 pt-1">
            {groups.map((g) => (
              <Checkbox
                key={g.id}
                name="groupIds"
                value={g.id}
                label={g.name}
                defaultChecked={selectedGroups.includes(String(g.id))}
              />
            ))}
          </div>
        </Field>

        <Field label="Описание (Markdown)" htmlFor="description_md" error={fe.description_md}>
          <Textarea
            id="description_md"
            name="description_md"
            rows={10}
            className="font-mono"
            defaultValue={valueOf(state, 'description_md', lesson.description_md)}
          />
        </Field>

        <FormMessage state={state} />
        <div>
          <SubmitButton>{lesson.id ? 'Сохранить' : 'Создать занятие'}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
