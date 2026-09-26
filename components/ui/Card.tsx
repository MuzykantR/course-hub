import { cn } from '@/lib/cn';

export function Card({
  className,
  size = 'md',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'border-2 border-theme-border bg-theme-card backdrop-blur',
        size === 'lg' ? 'rounded-card-lg p-6 shadow-neo-lg md:p-8' : 'rounded-card p-5 shadow-neo',
        className,
      )}
      {...props}
    />
  );
}
