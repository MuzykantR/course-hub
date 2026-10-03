import 'server-only';
import { toPrefixTsQuery, type KbFilters } from '@/lib/validation/kb';
import { db } from '../client';
import { getPeople } from './people';

export const KB_PAGE_SIZE = 24;

export type KbItem = {
  type: 'task' | 'report';
  id: number;
  href: string;
  title: string;
  date: string;
  groupIds: number[];
  studentIds: number[];
  tags: string[];
  difficulty: string | null;
};

const COLUMNS = 'type, id, slug, title, date, group_ids, student_ids, tags, difficulty';

type Row = {
  type: string | null;
  id: number | null;
  slug: string | null;
  title: string | null;
  date: string | null;
  group_ids: number[] | null;
  student_ids: number[] | null;
  tags: string[] | null;
  difficulty: string | null;
};

export function toKbItem(r: Row): KbItem {
  const type = r.type === 'report' ? 'report' : 'task';
  return {
    type,
    id: r.id!,
    href: type === 'report' ? `/reports/${r.slug}` : `/tasks/${r.id}`,
    title: r.title ?? '',
    date: r.date ?? '',
    groupIds: r.group_ids ?? [],
    studentIds: r.student_ids ?? [],
    tags: r.tags ?? [],
    difficulty: r.difficulty,
  };
}

export async function listKb(filters: KbFilters): Promise<{ items: KbItem[]; total: number }> {
  const people = await getPeople();
  let query = db().from('kb_items').select(COLUMNS, { count: 'exact' });

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.group) {
    const group = people.groupBySlug.get(filters.group);
    if (!group) return { items: [], total: 0 };
    query = query.contains('group_ids', [group.id]);
  }
  if (filters.student) {
    const student = people.studentBySlug.get(filters.student);
    if (!student) return { items: [], total: 0 };
    query = query.contains('student_ids', [student.id]);
  }
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.q) {
    const tsquery = toPrefixTsQuery(filters.q);
    if (!tsquery) return { items: [], total: 0 };
    query = query.textSearch('search', tsquery, { config: 'russian' });
  }

  if (filters.sort === 'title') query = query.order('title', { ascending: true });
  else {
    const ascending = filters.sort === 'old';
    query = query.order('date', { ascending }).order('id', { ascending });
  }

  const from = (filters.page - 1) * KB_PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + KB_PAGE_SIZE - 1);
  if (error) throw new Error(`kb_items: ${error.message}`);
  return { items: data.map(toKbItem), total: count ?? 0 };
}

/** Tag cloud for the filter panel, most used first. */
export async function listKbTags(): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await db().from('kb_items').select('tags');
  if (error) throw new Error(`kb_items tags: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of data) for (const t of row.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
