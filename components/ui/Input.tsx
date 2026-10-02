import { cn } from '@/lib/cn';

const fieldClass =
  'h-11 w-full rounded-xl border-2 border-theme-border bg-theme-input px-4 text-sm text-theme-main placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, 'pr-8', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-bold uppercase tracking-widest text-theme-muted', className)}
      {...props}
    />
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 border-theme-border bg-danger-100 px-3 py-2 text-sm font-medium text-danger-900 dark:bg-danger-950 dark:text-danger-200"
    >
      {message}
    </p>
  );
}
