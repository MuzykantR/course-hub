import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { AutoSubmit } from '@/components/kb/AutoSubmit';
import { KbItemCard } from '@/components/kb/KbItemCard';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { EmptyState, PageHeader } from '@/components/ui/PageHeader';
import { requireSession } from '@/lib/auth/guards';
import { KB_PAGE_SIZE, listKb } from '@/lib/db/queries/kb';
import { getPeople } from '@/lib/db/queries/people';
import { plural } from '@/lib/format';
import { kbHref, parseKbFilters } from '@/lib/validation/kb';

export const metadata: Metadata = { title: 'База знаний' };

export default async function KbPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = parseKbFilters(await searchParams);
  const [{ items, total }, people] = await Promise.all([listKb(filters), getPeople()]);
  const pages = Math.max(1, Math.ceil(total / KB_PAGE_SIZE));
  const hasFilters = Boolean(
    filters.q || filters.type || filters.group || filters.student || filters.tag,
  );

  return (
    <>
      <PageHeader eyebrow="Задачи и доклады" title="База знаний">
        <p className="max-w-2xl text-theme-secondary">
          Все опубликованные задачи с семинаров и доклады по библиотекам. Фильтры сохраняются в
          ссылке — ей можно поделиться.
        </p>
        {session.role === 'student' && (
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <Link
              href="/submit/solution"
              className="rounded-pill border-2 border-theme-border bg-theme-accent px-4 py-2 text-theme-accentText shadow-neo-sm"
            >
              + Предложить решение
            </Link>
            <Link
              href="/submit/report"
              className="rounded-pill border-2 border-theme-border bg-theme-card px-4 py-2 shadow-neo-sm"
            >
              + Предложить доклад
            </Link>
          </div>
        )}
      </PageHeader>

      <form
        action="/kb"
        method="get"
        role="search"
        className="flex flex-col gap-4 rounded-card border-2 border-theme-border bg-theme-card p-4 shadow-neo backdrop-blur md:p-5"
      >
        <AutoSubmit />
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
            <Input
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Поиск: «два указателя», numpy, словари…"
              aria-label="Поиск"
              className="pl-10"
            />
          </div>
          <Button type="submit">Найти</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kb-type">Тип</Label>
            <Select id="kb-type" name="type" defaultValue={filters.type ?? ''}>
              <option value="">Всё</option>
              <option value="task">Задачи</option>
              <option value="report">Доклады</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kb-group">Группа</Label>
            <Select id="kb-group" name="group" defaultValue={filters.group ?? ''}>
              <option value="">Все группы</option>
              {people.groups.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kb-student">Студент</Label>
            <Select id="kb-student" name="student" defaultValue={filters.student ?? ''}>
              <option value="">Все студенты</option>
              {people.groups.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {people.students
                    .filter((s) => s.groupId === g.id)
                    .map((s) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kb-sort">Сортировка</Label>
            <Select id="kb-sort" name="sort" defaultValue={filters.sort}>
              <option value="new">Сначала новые</option>
              <option value="old">Сначала старые</option>
              <option value="title">По названию</option>
            </Select>
          </div>
        </div>
      </form>

      <section className="flex flex-col gap-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-theme-secondary">
            {total} {plural(total, ['материал', 'материала', 'материалов'])}
          </p>
          {hasFilters && (
            <Link
              href="/kb"
              className="inline-flex items-center gap-1 text-sm font-bold text-theme-secondary hover:text-theme-main"
            >
              <X className="h-4 w-4" /> Сбросить фильтры
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState>
            {hasFilters
              ? 'Ничего не нашлось. Попробуйте другой запрос или сбросьте фильтры.'
              : 'Пока пусто — материалы появятся после первых занятий.'}
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <KbItemCard key={`${item.type}-${item.id}`} item={item} people={people} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Страницы" className="flex items-center justify-center gap-2">
            {filters.page > 1 && (
              <Link
                href={kbHref(filters, { page: filters.page - 1 })}
                className="rounded-pill border-2 border-theme-border bg-theme-card px-4 py-2 text-sm font-bold shadow-neo-sm"
              >
                ← Назад
              </Link>
            )}
            <span className="px-2 text-sm font-semibold">
              {filters.page} / {pages}
            </span>
            {filters.page < pages && (
              <Link
                href={kbHref(filters, { page: filters.page + 1 })}
                className="rounded-pill border-2 border-theme-border bg-theme-card px-4 py-2 text-sm font-bold shadow-neo-sm"
              >
                Дальше →
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
