import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  eyebrow,
  title,
  back,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm font-bold text-theme-secondary hover:text-theme-main"
        >
          <ChevronLeft className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      {eyebrow && (
        <p className="text-sm font-semibold text-theme-muted">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {children}
    </header>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-theme-borderSubtle p-8 text-center text-sm text-theme-muted">
      {children}
    </div>
  );
}

export function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
      {children}
      {count !== undefined && (
        <span className="rounded-pill border-2 border-theme-border bg-theme-card px-2 text-sm">
          {count}
        </span>
      )}
    </h2>
  );
}
