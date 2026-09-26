'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import {
  DIFFICULTY_LABELS,
  EnumOptions,
  StudentOptions,
  TASK_STATUS_LABELS,
  VERDICT_LABELS,
} from '@/components/admin/Options';
import { Card } from '@/components/ui/Card';
import { Field, Textarea, valueOf } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import type { GroupRef, StudentRef } from '@/lib/db/queries/people';
import { formKey, initialFormState } from '@/lib/forms';
import { formatDate } from '@/lib/format';
import { saveTask } from './actions';

export type TaskFormValues = {
  id?: number;
  lesson_id: number | null;
  order: number;
  title: string;
  statement_md: string;
  difficulty: string;
  tags: string[];
  assigned_student_id: number | null;
  status: string;
  verdict: string;
  runtime_ms: number | null;
  memory_mb: number | null;
  tests: unknown;
};

type LessonOption = { id: number; number: number; title: string; date: string };

export function TaskForm({
  task,
  lessons,
  groups,
  students,
}: {
  task: TaskFormValues;
  lessons: LessonOption[];
  groups: GroupRef[];
  students: StudentRef[];
}) {
  const [state, action] = useActionState(saveTask, initialFormState);
  const fe = state.fieldErrors ?? {};
  const v = (name: keyof TaskFormValues) =>
    valueOf(
      state,
      name,
      Array.isArray(task[name])
        ? (task[name] as string[]).join(', ')
        : (task[name] as string | number | null),
    );

  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="flex flex-col gap-5">
        {task.id && <input type="hidden" name="id" value={task.id} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
          <Field label="Занятие" htmlFor="lesson_id" error={fe.lesson_id}>
            <Select id="lesson_id" name="lesson_id" required defaultValue={v('lesson_id')}>
              <option value="" disabled>
                Выберите занятие
              </option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.number}. {l.title} — {formatDate(l.date)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="№ в занятии" htmlFor="order" error={fe.order}>
            <Input
              id="order"
              name="order"
              type="number"
              min={1}
              max={99}
              required
              defaultValue={v('order')}
            />
          </Field>
        </div>

        <Field label="Название" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" required maxLength={200} defaultValue={v('title')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Статус"
            htmlFor="status"
            error={fe.status}
            hint="Черновик не виден студентам."
          >
            <Select id="status" name="status" defaultValue={v('status')}>
              <EnumOptions labels={TASK_STATUS_LABELS} />
            </Select>
          </Field>
          <Field label="Сложность" htmlFor="difficulty" error={fe.difficulty}>
            <Select id="difficulty" name="difficulty" defaultValue={v('difficulty')}>
              <EnumOptions labels={DIFFICULTY_LABELS} />
            </Select>
          </Field>
          <Field label="У доски" htmlFor="assigned_student_id" error={fe.assigned_student_id}>
            <Select
              id="assigned_student_id"
              name="assigned_student_id"
              defaultValue={v('assigned_student_id')}
            >
              <option value="">— никто —</option>
              <StudentOptions groups={groups} students={students} />
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Вердикт" htmlFor="verdict" error={fe.verdict}>
            <Select id="verdict" name="verdict" defaultValue={v('verdict')}>
              <EnumOptions labels={VERDICT_LABELS} />
            </Select>
          </Field>
          <Field label="Время, мс" htmlFor="runtime_ms" error={fe.runtime_ms}>
            <Input
              id="runtime_ms"
              name="runtime_ms"
              type="number"
              min={0}
              defaultValue={v('runtime_ms')}
            />
          </Field>
          <Field label="Память, МБ" htmlFor="memory_mb" error={fe.memory_mb}>
            <Input
              id="memory_mb"
              name="memory_mb"
              type="number"
              min={0}
              step="0.01"
              defaultValue={v('memory_mb')}
            />
          </Field>
        </div>

        <Field
          label="Теги"
          htmlFor="tags"
          error={fe.tags}
          hint="Через запятую: arrays, two-pointers"
        >
          <Input id="tags" name="tags" defaultValue={v('tags')} placeholder="arrays, hash-map" />
        </Field>

        <Field label="Условие (Markdown)" htmlFor="statement_md" error={fe.statement_md}>
          <Textarea
            id="statement_md"
            name="statement_md"
            rows={14}
            className="font-mono"
            defaultValue={v('statement_md')}
          />
        </Field>

        <Field
          label="Тесты для запуска в браузере (JSON, необязательно)"
          htmlFor="tests"
          error={fe.tests}
          hint={
            <>
              Массив: <code className="font-mono">{'{"type": "assert", "name": "пример", "code": "assert f(2) == 4"}'}</code> или{' '}
              <code className="font-mono">{'{"type": "io", "name": "ввод", "input": "2 3", "expected": "5"}'}</code>
            </>
          }
        >
          <Textarea
            id="tests"
            name="tests"
            rows={6}
            spellCheck={false}
            className="font-mono text-xs"
            defaultValue={valueOf(state, 'tests', task.tests ? JSON.stringify(task.tests, null, 2) : '')}
          />
        </Field>

        <FormMessage state={state} />
        <div>
          <SubmitButton>{task.id ? 'Сохранить' : 'Создать задачу'}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
