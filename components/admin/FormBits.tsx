'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/forms';

export function SubmitButton({
  children,
  pendingText = 'Сохраняем…',
  variant,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border-2 border-theme-border bg-danger-100 px-3 py-2 text-sm font-medium text-danger-900 dark:bg-danger-950 dark:text-danger-200"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-xl border-2 border-theme-border bg-success-100 px-3 py-2 text-sm font-medium text-success-900 dark:bg-success-950 dark:text-success-200"
      >
        {state.ok}
      </p>
    );
  }
  return null;
}

/** A one-button form for destructive actions, guarded by a native confirm dialog. */
export function ConfirmForm({
  action,
  confirm,
  children,
  hidden,
  className,
}: {
  action: (fd: FormData) => void | Promise<void>;
  confirm: string;
  children: React.ReactNode;
  hidden?: Record<string, string | number>;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );
}
