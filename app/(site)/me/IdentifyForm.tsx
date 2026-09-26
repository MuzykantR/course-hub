'use client';

import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Input';
import { identify, type IdentifyState } from './actions';

export type StudentOption = { id: number; name: string; group: string; hasPin: boolean };

const pinProps = {
  type: 'password',
  inputMode: 'numeric',
  pattern: '\\d{4,6}',
  minLength: 4,
  maxLength: 6,
  autoComplete: 'off',
  required: true,
  className: 'font-mono tracking-[0.4em]',
} as const;

export function IdentifyForm({ students }: { students: StudentOption[] }) {
  const [state, action, pending] = useActionState<IdentifyState, FormData>(identify, {
    error: null,
  });
  const [selected, setSelected] = useState('');

  const byGroup = useMemo(() => {
    const map = new Map<string, StudentOption[]>();
    for (const s of students) map.set(s.group, [...(map.get(s.group) ?? []), s]);
    return [...map.entries()];
  }, [students]);

  const current = students.find((s) => String(s.id) === selected);
  const settingPin = current !== undefined && !current.hasPin;

  if (students.length === 0) {
    return (
      <p className="mt-6 text-sm text-theme-secondary">
        Список студентов пока пуст — преподаватель ещё не добавил группы.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="studentId">Я —</Label>
        <Select
          id="studentId"
          name="studentId"
          required
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="" disabled>
            Выберите себя
          </option>
          {byGroup.map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      {current && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin">{settingPin ? 'Придумайте PIN' : 'PIN'}</Label>
            <Input id="pin" name="pin" {...pinProps} />
          </div>
          {settingPin && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="pinConfirm">Повторите PIN</Label>
              <Input id="pinConfirm" name="pinConfirm" {...pinProps} />
              <p className="text-xs text-theme-muted">
                Забыли PIN — преподаватель может его сбросить.
              </p>
            </div>
          )}
        </>
      )}

      <FormError message={state.error} />
      <Button type="submit" disabled={pending || !current}>
        {pending ? 'Проверяем…' : settingPin ? 'Задать PIN и продолжить' : 'Подтвердить'}
      </Button>
    </form>
  );
}
