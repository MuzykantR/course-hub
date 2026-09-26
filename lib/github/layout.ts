// Pure: published course content → the full file tree of the export repository.
// Layout:
//   README.md                                  — table of contents
//   2026-09-05_spiski-i-dva-ukazatelya/
//     README.md                                — lesson description + task list
//     tasks/01-dva-chisla-s-zadannoy-summoy.md
//     solutions/01-dva-chisla-s-zadannoy-summoy/anna-ivanova.py (+ .md explanation)
//     reports/numpy-basics/README.md (+ images next to it, so relative links work)
//   reports/<slug>/…                           — reports not tied to a lesson
import { slugify } from '@/lib/slug';

export type ExportInput = {
  courseTitle: string;
  groups: { id: number; name: string }[];
  students: { id: number; name: string; slug: string }[];
  lessons: {
    id: number;
    date: string;
    number: number;
    title: string;
    description_md: string;
    groupIds: number[];
  }[];
  tasks: {
    id: number;
    lesson_id: number;
    order: number;
    title: string;
    statement_md: string;
    difficulty: string;
    tags: string[];
    verdict: string;
    runtime_ms: number | null;
    memory_mb: number | null;
    assigned_student_id: number | null;
  }[];
  solutions: {
    task_id: number;
    author_student_id: number;
    code: string;
    explanation_md: string | null;
    is_featured: boolean;
  }[];
  reports: {
    id: number;
    slug: string;
    title: string;
    library: string;
    summary: string;
    content_md: string;
    lesson_id: number | null;
    group_id: number;
    tags: string[];
    authorIds: number[];
  }[];
  assets: { report_id: number; name: string; base64: string }[];
};

export type ExportFile = { path: string; content: string } | { path: string; base64: string };

const DIFFICULTY: Record<string, string> = { easy: 'лёгкая', medium: 'средняя', hard: 'сложная' };
const VERDICT: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  tle: 'Time Limit Exceeded',
  runtime_error: 'Runtime Error',
  not_checked: 'не проверено',
};

const pad = (n: number) => String(n).padStart(2, '0');
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function lessonDir(l: { date: string; title: string }): string {
  return `${l.date}_${slugify(l.title, 50) || 'lesson'}`;
}

export function taskFileBase(t: { order: number; title: string }): string {
  return `${pad(t.order)}-${slugify(t.title, 50) || 'task'}`;
}

/** Python comments can't break out, but keep headers single-line and printable. */
const comment = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function buildExportFiles(input: ExportInput): ExportFile[] {
  const files: ExportFile[] = [];
  const student = new Map(input.students.map((s) => [s.id, s]));
  const group = new Map(input.groups.map((g) => [g.id, g]));
  const lessonById = new Map(input.lessons.map((l) => [l.id, l]));
  const lessons = [...input.lessons].sort(
    (a, b) => a.date.localeCompare(b.date) || a.number - b.number,
  );
  const names = (ids: number[]) =>
    ids
      .map((id) => student.get(id)?.name)
      .filter(Boolean)
      .join(', ');

  const reportDir = (r: ExportInput['reports'][number]) => {
    const lesson = r.lesson_id ? lessonById.get(r.lesson_id) : undefined;
    return lesson ? `${lessonDir(lesson)}/reports/${r.slug}` : `reports/${r.slug}`;
  };

  const toc: string[] = [];
  const usedBases = new Set<string>();
  /** A student may have several approved solutions of one task: keep them all. */
  const uniqueBase = (base: string) => {
    let candidate = base;
    for (let i = 2; usedBases.has(candidate); i++) candidate = `${base}-${i}`;
    usedBases.add(candidate);
    return candidate;
  };

  for (const lesson of lessons) {
    const dir = lessonDir(lesson);
    const tasks = input.tasks
      .filter((t) => t.lesson_id === lesson.id)
      .sort((a, b) => a.order - b.order);
    const reports = input.reports.filter((r) => r.lesson_id === lesson.id);
    const groups = lesson.groupIds
      .map((id) => group.get(id)?.name)
      .filter(Boolean)
      .join(', ');

    const readme = [`# Занятие ${lesson.number}. ${lesson.title}`, '', `**Дата:** ${lesson.date}`];
    if (groups) readme.push(`**Группы:** ${groups}`);
    if (lesson.description_md.trim()) readme.push('', lesson.description_md.trim());

    if (tasks.length) {
      readme.push(
        '',
        '## Задачи',
        '',
        '| № | Задача | Сложность | У доски | Вердикт | Решения |',
        '|---|---|---|---|---|---|',
      );
      for (const t of tasks) {
        const base = taskFileBase(t);
        const sols = input.solutions.filter((s) => s.task_id === t.id);
        const assigned = t.assigned_student_id
          ? (student.get(t.assigned_student_id)?.name ?? '—')
          : '—';
        readme.push(
          `| ${t.order} | [${cell(t.title)}](tasks/${base}.md) | ${DIFFICULTY[t.difficulty] ?? t.difficulty} | ${cell(assigned)} | ${VERDICT[t.verdict] ?? t.verdict} | ${sols.length ? `[${sols.length}](solutions/${base}/)` : '—'} |`,
        );

        const meta = [
          `# ${t.order}. ${t.title}`,
          '',
          `- **Занятие:** ${lesson.number}. ${lesson.title} (${lesson.date})`,
          `- **Сложность:** ${DIFFICULTY[t.difficulty] ?? t.difficulty}`,
          `- **У доски:** ${assigned}`,
          `- **Вердикт:** ${VERDICT[t.verdict] ?? t.verdict}`,
        ];
        if (t.runtime_ms != null) meta.push(`- **Время:** ${t.runtime_ms} мс`);
        if (t.memory_mb != null) meta.push(`- **Память:** ${t.memory_mb} МБ`);
        if (t.tags.length) meta.push(`- **Теги:** ${t.tags.map((x) => `\`${x}\``).join(', ')}`);
        meta.push('', '## Условие', '', t.statement_md.trim() || '_Условие не добавлено._', '');
        files.push({ path: `${dir}/tasks/${base}.md`, content: meta.join('\n') });

        for (const s of sols) {
          const author = student.get(s.author_student_id);
          const fileBase = uniqueBase(
            `${dir}/solutions/${base}/${author?.slug ?? `student-${s.author_student_id}`}`,
          );
          const header = [
            `# Задача: ${comment(t.title)}`,
            `# Автор: ${comment(author?.name ?? 'неизвестен')}`,
            ...(s.is_featured ? ['# Разобрано у доски'] : []),
            '',
          ].join('\n');
          files.push({
            path: `${fileBase}.py`,
            content: `${header}\n${s.code.replace(/\s+$/, '')}\n`,
          });
          if (s.explanation_md?.trim()) {
            files.push({
              path: `${fileBase}.md`,
              content: `# Пояснение: ${author?.name ?? ''}\n\n${s.explanation_md.trim()}\n`,
            });
          }
        }
      }
    }

    if (reports.length) {
      readme.push('', '## Доклады', '');
      for (const r of reports) {
        readme.push(`- [${r.title}](reports/${r.slug}/) — ${r.library}, ${names(r.authorIds)}`);
      }
    }
    files.push({ path: `${dir}/README.md`, content: `${readme.join('\n')}\n` });
    toc.push(
      `| ${lesson.date} | [${lesson.number}. ${cell(lesson.title)}](${dir}/) | ${tasks.length} | ${reports.length} |`,
    );
  }

  for (const r of input.reports) {
    const dir = reportDir(r);
    const head = [
      `# ${r.title}`,
      '',
      `- **Библиотека:** ${r.library}`,
      `- **Авторы:** ${names(r.authorIds) || '—'}`,
      `- **Группа:** ${group.get(r.group_id)?.name ?? '—'}`,
    ];
    if (r.tags.length) head.push(`- **Теги:** ${r.tags.map((x) => `\`${x}\``).join(', ')}`);
    if (r.summary.trim()) head.push('', `> ${r.summary.trim()}`);
    files.push({
      path: `${dir}/README.md`,
      content: `${head.join('\n')}\n\n---\n\n${r.content_md.trim()}\n`,
    });
    for (const a of input.assets.filter((x) => x.report_id === r.id)) {
      files.push({ path: `${dir}/${a.name}`, base64: a.base64 });
    }
  }

  const loose = input.reports.filter((r) => !r.lesson_id || !lessonById.has(r.lesson_id));
  const root = [
    `# ${input.courseTitle}`,
    '',
    'Материалы курса: условия задач с семинаров, решения студентов и доклады по библиотекам Python.',
    'Репозиторий обновляется автоматически после модерации на сайте курса.',
    '',
    '## Занятия',
    '',
    '| Дата | Занятие | Задач | Докладов |',
    '|---|---|---|---|',
    ...toc,
  ];
  if (loose.length) {
    root.push('', '## Доклады вне занятий', '');
    for (const r of loose)
      root.push(`- [${r.title}](reports/${r.slug}/) — ${r.library}, ${names(r.authorIds)}`);
  }
  files.push({ path: 'README.md', content: `${root.join('\n')}\n` });

  // Code-point order: deterministic regardless of locale.
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
