import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-card-lg border-2 border-theme-border bg-theme-card p-8 shadow-neo-lg">
      <p className="font-mono text-5xl font-bold">404</p>
      <h1 className="text-2xl font-bold">Такой страницы нет</h1>
      <p className="text-theme-secondary">
        Возможно, материал ещё не опубликован или ссылка устарела.
      </p>
      <Link
        href="/kb"
        className="rounded-pill border-2 border-theme-border bg-theme-accent px-5 py-2.5 text-sm font-bold text-theme-accentText shadow-neo-sm"
      >
        В базу знаний
      </Link>
    </section>
  );
}
