import Link from 'next/link';
import type { People } from '@/lib/db/queries/people';

/** Comma-separated student links; unknown ids (deleted students) are skipped. */
export function StudentLinks({ ids, people }: { ids: number[]; people: People }) {
  const list = ids.map((id) => people.studentById.get(id)).filter((s) => s !== undefined);
  if (list.length === 0) return null;
  return (
    <span>
      {list.map((s, i) => (
        <span key={s.id}>
          {i > 0 && ', '}
          <Link href={`/students/${s.slug}`} className="font-semibold hover:underline">
            {s.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

export function GroupLinks({ ids, people }: { ids: number[]; people: People }) {
  const list = ids.map((id) => people.groupById.get(id)).filter((g) => g !== undefined);
  if (list.length === 0) return null;
  return (
    <span>
      {list.map((g, i) => (
        <span key={g.id}>
          {i > 0 && ' · '}
          <Link href={`/groups/${g.slug}`} className="hover:underline">
            {g.name}
          </Link>
        </span>
      ))}
    </span>
  );
}
