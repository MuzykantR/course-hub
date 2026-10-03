import Link from 'next/link';
import { DifficultyBadge, TypeBadge } from '@/components/ui/Badge';
import type { KbItem } from '@/lib/db/queries/kb';
import type { People } from '@/lib/db/queries/people';
import { formatDate } from '@/lib/format';
import { GroupLinks, StudentLinks } from './People';

export function KbItemCard({ item, people }: { item: KbItem; people: People }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border-2 border-theme-border bg-theme-card p-5 shadow-neo backdrop-blur transition hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={item.type} />
        {item.type === 'task' && <DifficultyBadge difficulty={item.difficulty} />}
        {item.date && (
          <span className="ml-auto text-xs font-semibold text-theme-muted">
            {formatDate(item.date)}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold leading-snug">
        <Link href={item.href} className="hover:underline">
          {item.title}
        </Link>
      </h3>
      <div className="flex flex-col gap-1 text-sm text-theme-secondary">
        {item.studentIds.length > 0 && <StudentLinks ids={item.studentIds} people={people} />}
        {item.groupIds.length > 0 && (
          <span className="text-xs text-theme-muted">
            <GroupLinks ids={item.groupIds} people={people} />
          </span>
        )}
      </div>
    </article>
  );
}
