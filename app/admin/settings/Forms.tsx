'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@/components/admin/FormBits';
import { Checkbox, Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { initialFormState } from '@/lib/forms';
import { changeCoursePassword, exportNow, saveToggles } from './actions';

export function CoursePasswordForm() {
  const [state, action] = useActionState(changeCoursePassword, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Новый пароль курса"
          htmlFor="password"
          error={fe.password}
          hint="Минимум 8 символов."
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Повторите" htmlFor="confirm" error={fe.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Сменить пароль</SubmitButton>
      </div>
    </form>
  );
}

export function TogglesForm({
  submissionsOpen,
  githubExport,
}: {
  submissionsOpen: boolean;
  githubExport: boolean;
}) {
  const [state, action] = useActionState(saveToggles, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Checkbox
        name="submissions_open"
        label="Приём заявок открыт"
        hint="Когда выключено, студенты не могут предлагать решения и доклады."
        defaultChecked={submissionsOpen}
      />
      <Checkbox
        name="github_export_enabled"
        label="Экспорт в GitHub"
        hint="Одобренные материалы будут коммититься в репозиторий курса (этап 5)."
        defaultChecked={githubExport}
      />
      <FormMessage state={state} />
      <div>
        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  );
}

export function ExportNowForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(exportNow, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <div>
        <SubmitButton variant="secondary" pendingText="Экспортируем…">
          Экспортировать сейчас
        </SubmitButton>
        {disabled && (
          <p className="mt-2 text-xs text-theme-muted">
            Сначала задайте GITHUB_EXPORT_TOKEN и GITHUB_EXPORT_REPO.
          </p>
        )}
      </div>
    </form>
  );
}
