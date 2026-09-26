'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { EnumOptions, REVIEW_STATUS_LABELS, StudentOptions } from '@/components/admin/Options';
import { Card } from '@/components/ui/Card';
import { Checkbox, Field, Textarea, checkedOf, valueOf } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import type { GroupRef, StudentRef } from '@/lib/db/queries/people';
import { formKey, initialFormState } from '@/lib/forms';
import { saveSolution } from './actions';

export type SolutionFormValues = {
  id?: number;
  task_id: number | null;
  author_student_id: number | null;
  code: string;
  explanation_md: string | null;
  is_featured: boolean;
  status: string;
  review_comment: string | null;
};

type TaskOption = { id: number; order: number; title: string; lesson: { number: number } };

export function SolutionForm({
  solution,
  tasks,
  groups,
  students,
}: {
  solution: SolutionFormValues;
  tasks: TaskOption[];
  groups: GroupRef[];
  students: StudentRef[];
}) {
  const [state, action] = useActionState(saveSolution, initialFormState);
  const fe = state.fieldErrors ?? {};

  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="flex flex-col gap-5">
        {solution.id && <input type="hidden" name="id" value={solution.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Задача" htmlFor="task_id" error={fe.task_id}>
            <Select
              id="task_id"
              name="task_id"
              required
              defaultValue={valueOf(state, 'task_id', solution.task_id)}
            >
              <option value="" disabled>
                Выберите задачу
              </option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lesson.number}.{t.order} {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Автор" htmlFor="author_student_id" error={fe.author_student_id}>
            <Select
              id="author_student_id"
              name="author_student_id"
              required
              defaultValue={valueOf(state, 'author_student_id', solution.author_student_id)}
            >
              <option value="" disabled>
                Выберите студента
              </option>
              <StudentOptions groups={groups} students={students} />
            </Select>
          </Field>
        </div>

        <Field label="Код (Python)" htmlFor="code" error={fe.code} hint="До 20 КБ.">
          <Textarea
            id="code"
            name="code"
            rows={14}
            required
            spellCheck={false}
            className="font-mono"
            defaultValue={valueOf(state, 'code', solution.code)}
          />
        </Field>

        <Field
          label="Пояснение (Markdown, необязательно)"
          htmlFor="explanation_md"
          error={fe.explanation_md}
        >
          <Textarea
            id="explanation_md"
            name="explanation_md"
            rows={5}
            className="font-mono"
            defaultValue={valueOf(state, 'explanation_md', solution.explanation_md)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Статус" htmlFor="status" error={fe.status}>
            <Select
              id="status"
              name="status"
              defaultValue={valueOf(state, 'status', solution.status)}
            >
              <EnumOptions labels={REVIEW_STATUS_LABELS} />
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox
              name="is_featured"
              label="Разобрано у доски"
              hint="Такое решение показывается первым."
              defaultChecked={checkedOf(state, 'is_featured', solution.is_featured)}
            />
          </div>
        </div>

        <Field
          label="Комментарий проверяющего"
          htmlFor="review_comment"
          error={fe.review_comment}
          hint="Студент увидит его в «Моих заявках»."
        >
          <Textarea
            id="review_comment"
            name="review_comment"
            rows={3}
            maxLength={2000}
            defaultValue={valueOf(state, 'review_comment', solution.review_comment)}
          />
        </Field>

        <FormMessage state={state} />
        <div>
          <SubmitButton>{solution.id ? 'Сохранить' : 'Добавить решение'}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
