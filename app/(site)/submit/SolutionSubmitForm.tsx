'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Card } from '@/components/ui/Card';
import { Field, Textarea, valueOf } from '@/components/ui/Field';
import { Honeypot } from '@/components/ui/Honeypot';
import { Select } from '@/components/ui/Input';
import { formKey, initialFormState } from '@/lib/forms';
import { submitSolution } from './actions';

type TaskOption = { id: number; order: number; title: string; lesson: { number: number } };

/** Tab inserts four spaces instead of leaving the field — this is a code box. */
function onCodeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key !== 'Tab' || e.shiftKey) return;
  e.preventDefault();
  const el = e.currentTarget;
  el.setRangeText('    ', el.selectionStart, el.selectionEnd, 'end');
}

export function SolutionSubmitForm({
  tasks,
  taskId,
}: {
  tasks: TaskOption[];
  taskId: number | null;
}) {
  const [state, action] = useActionState(submitSolution, initialFormState);
  const fe = state.fieldErrors ?? {};

  return (
    <Card size="lg">
      <form key={formKey(state)} action={action} className="relative flex flex-col gap-5">
        <Honeypot />
        <Field label="Задача" htmlFor="task_id" error={fe.task_id}>
          <Select
            id="task_id"
            name="task_id"
            required
            defaultValue={valueOf(state, 'task_id', taskId)}
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
        <Field
          label="Код на Python"
          htmlFor="code"
          error={fe.code}
          hint="До 20 КБ. Tab вставляет отступ."
        >
          <Textarea
            id="code"
            name="code"
            rows={16}
            required
            spellCheck={false}
            className="font-mono"
            onKeyDown={onCodeKeyDown}
            defaultValue={valueOf(state, 'code', '')}
          />
        </Field>
        <Field
          label="Пояснение (необязательно)"
          htmlFor="explanation_md"
          error={fe.explanation_md}
          hint="Markdown: идея, сложность, подводные камни."
        >
          <Textarea
            id="explanation_md"
            name="explanation_md"
            rows={5}
            defaultValue={valueOf(state, 'explanation_md', '')}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Отправляем…">Отправить на проверку</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
