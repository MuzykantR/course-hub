import { describe, expect, it } from 'vitest';
import { buildExportFiles, type ExportInput } from '@/lib/github/layout';

const input: ExportInput = {
  courseTitle: 'Python HSE Hub',
  groups: [{ id: 1, name: 'Группа 1' }],
  students: [
    { id: 10, name: 'Анна Иванова', slug: 'anna-ivanova' },
    { id: 11, name: 'Борис Петров', slug: 'boris-petrov' },
  ],
  lessons: [
    { id: 2, date: '2026-09-12', number: 2, title: 'Словари', description_md: '', groupIds: [1] },
    {
      id: 1,
      date: '2026-09-05',
      number: 1,
      title: 'Списки и два указателя',
      description_md: 'Про списки',
      groupIds: [1],
    },
  ],
  tasks: [
    {
      id: 5,
      lesson_id: 1,
      order: 1,
      title: 'Два числа',
      statement_md: 'Найдите пару',
      difficulty: 'easy',
      tags: ['arrays'],
      assigned_student_id: 10,
    },
  ],
  solutions: [
    {
      task_id: 5,
      author_student_id: 10,
      code: 'print(1)\n\n',
      explanation_md: 'Идея: $O(n)$',
      is_featured: true,
    },
    {
      task_id: 5,
      author_student_id: 10,
      code: 'print(2)',
      explanation_md: null,
      is_featured: false,
    },
  ],
  reports: [
    {
      id: 7,
      slug: 'numpy-basics',
      title: 'NumPy',
      library: 'numpy',
      summary: 'Массивы',
      content_md: '![](plot.png)',
      lesson_id: 1,
      group_id: 1,
      tags: [],
      authorIds: [10, 11],
    },
    {
      id: 8,
      slug: 'requests-http',
      title: 'requests',
      library: 'requests',
      summary: '',
      content_md: 'HTTP',
      lesson_id: null,
      group_id: 1,
      tags: [],
      authorIds: [11],
    },
  ],
  assets: [{ report_id: 7, name: 'plot.png', base64: 'iVBORw0K' }],
};

describe('buildExportFiles', () => {
  const files = buildExportFiles(input);
  const byPath = new Map(files.map((f) => [f.path, f]));
  const text = (p: string) => {
    const f = byPath.get(p);
    if (!f || !('content' in f)) throw new Error(`missing ${p}`);
    return f.content;
  };

  it('lays out lessons by date with tasks, solutions and reports', () => {
    expect([...byPath.keys()]).toEqual([
      '2026-09-05_spiski-i-dva-ukazatelya/README.md',
      '2026-09-05_spiski-i-dva-ukazatelya/reports/numpy-basics/README.md',
      '2026-09-05_spiski-i-dva-ukazatelya/reports/numpy-basics/plot.png',
      '2026-09-05_spiski-i-dva-ukazatelya/solutions/01-dva-chisla/anna-ivanova-2.py',
      '2026-09-05_spiski-i-dva-ukazatelya/solutions/01-dva-chisla/anna-ivanova.md',
      '2026-09-05_spiski-i-dva-ukazatelya/solutions/01-dva-chisla/anna-ivanova.py',
      '2026-09-05_spiski-i-dva-ukazatelya/tasks/01-dva-chisla.md',
      '2026-09-12_slovari/README.md',
      'README.md',
      'reports/requests-http/README.md',
    ]);
  });

  it('writes solution files with a readable header and trimmed code', () => {
    expect(text('2026-09-05_spiski-i-dva-ukazatelya/solutions/01-dva-chisla/anna-ivanova.py')).toBe(
      '# Задача: Два числа\n# Автор: Анна Иванова\n# Разобрано на паре\n\nprint(1)\n',
    );
  });

  it('keeps images next to the report so relative links work on GitHub', () => {
    expect(byPath.get('2026-09-05_spiski-i-dva-ukazatelya/reports/numpy-basics/plot.png')).toEqual({
      path: '2026-09-05_spiski-i-dva-ukazatelya/reports/numpy-basics/plot.png',
      base64: 'iVBORw0K',
    });
    expect(text('2026-09-05_spiski-i-dva-ukazatelya/reports/numpy-basics/README.md')).toContain(
      'Анна Иванова, Борис Петров',
    );
  });

  it('builds a root table of contents in date order plus loose reports', () => {
    const root = text('README.md');
    expect(root.indexOf('2026-09-05')).toBeLessThan(root.indexOf('2026-09-12'));
    expect(root).toContain(
      '| 2026-09-05 | [1. Списки и два указателя](2026-09-05_spiski-i-dva-ukazatelya/) | 1 | 1 |',
    );
    expect(root).toContain('[requests](reports/requests-http/)');
  });

  it('names who solved the task at the seminar, without tags', () => {
    const task = text('2026-09-05_spiski-i-dva-ukazatelya/tasks/01-dva-chisla.md');
    expect(task).toContain('**Решал на паре:** Анна Иванова');
    expect(task).not.toContain('Теги');
    expect(task).not.toContain('Вердикт');
  });

  it('omits an empty library from a report', () => {
    const files = buildExportFiles({
      ...input,
      reports: input.reports.map((r) => ({ ...r, library: '' })),
    });
    const report = files.find((f) => f.path.endsWith('requests-http/README.md'));
    expect(report && 'content' in report ? report.content : '').not.toContain('Библиотека');
  });
});
