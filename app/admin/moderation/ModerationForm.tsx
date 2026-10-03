'use client';

import { useActionState, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { FormMessage } from '@/components/admin/FormBits';
import { Button } from '@/components/ui/Button';
import { Checkbox, Textarea } from '@/components/ui/Field';
import { formKey, initialFormState } from '@/lib/forms';
import { moderate } from './actions';

export function ModerationForm({ kind, id }: { kind: 'solution' | 'report'; id: number }) {
  const [state, action, pending] = useActionState(moderate, initialFormState);
  // The clicked button's name/value isn't reliably part of an action's FormData,
  // so each button writes its decision into a hidden field right before submit.
  const decision = useRef<HTMLInputElement>(null);
  const choose = (value: 'approve' | 'reject') => () => {
    if (decision.current) decision.current.value = value;
  };

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form key={formKey(state)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input ref={decision} type="hidden" name="decision" defaultValue="" />
      <Textarea
        name="comment"
        rows={2}
        maxLength={2000}
        placeholder="Комментарий для студента (обязателен при отклонении)"
        defaultValue={typeof state.values?.comment === 'string' ? state.values.comment : ''}
        className="min-h-0"
      />
      {kind === 'solution' && <Checkbox name="is_featured" label="Разобрано на паре" />}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" onClick={choose('approve')} disabled={pending}>
          <Check className="h-4 w-4" /> Одобрить
        </Button>
        <Button type="submit" variant="secondary" onClick={choose('reject')} disabled={pending}>
          <X className="h-4 w-4" /> Отклонить
        </Button>
      </div>
    </form>
  );
}
