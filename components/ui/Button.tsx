import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-theme-accent text-theme-accentText hover:bg-theme-accentHover',
  secondary: 'bg-theme-card text-theme-main hover:bg-theme-cardHover',
  ghost: 'border-transparent bg-transparent shadow-none hover:bg-theme-cardMuted',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-pill border-2 border-theme-border px-5 text-sm font-bold shadow-neo-sm transition',
        'hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-border',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
