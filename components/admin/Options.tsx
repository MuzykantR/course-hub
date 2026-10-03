import type { GroupRef, StudentRef } from '@/lib/db/queries/people';

/** <option>s for a student select, grouped by group. */
export function StudentOptions({
  groups,
  students,
}: {
  groups: GroupRef[];
  students: StudentRef[];
}) {
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.id} label={g.name}>
          {students
            .filter((s) => s.groupId === g.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик (скрыта)',
  assigned: 'Назначена',
  solved: 'Решена',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'На модерации',
  approved: 'Одобрено (опубликовано)',
  rejected: 'Отклонено',
};

export function EnumOptions({ labels }: { labels: Record<string, string> }) {
  return (
    <>
      {Object.entries(labels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </>
  );
}
