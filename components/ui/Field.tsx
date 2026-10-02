import { cn } from '@/lib/cn';
import type { FormState } from '@/lib/forms';
import { Label } from './Input';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-danger-700 dark:text-danger-300">{error}</p>
      ) : (
        hint && <p className="text-xs text-theme-muted">{hint}</p>
      )}
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-[8rem] w-full rounded-xl border-2 border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-main placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent',
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-theme-border accent-[var(--accent-main)]"
        {...props}
      />
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-theme-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Value to show in a field: what the user just submitted (after an error) or the stored one. */
export function valueOf(
  state: FormState,
  name: string,
  fallback: string | number | null | undefined,
) {
  const v = state.values?.[name];
  if (typeof v === 'string') return v;
  return fallback == null ? '' : String(fallback);
}

export function valuesOf(state: FormState, name: string, fallback: (string | number)[]): string[] {
  const v = state.values?.[name];
  return Array.isArray(v) ? v : fallback.map(String);
}

export function checkedOf(state: FormState, name: string, fallback: boolean): boolean {
  if (!state.values) return fallback;
  return state.values[name] === 'on';
}
