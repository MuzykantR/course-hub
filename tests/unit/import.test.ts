import { describe, expect, it } from 'vitest';
import { localImageRefs, nameKey, parseReportFile } from '@/lib/import/frontmatter';
import { reportSlugBase } from '@/lib/slug';

describe('parseReportFile', () => {
  it('reads front matter and strips it from the body', () => {
    const meta = parseReportFile(
      'x.md',
      '﻿---\r\ntitle: "Seaborn: графики"\r\nlibrary: seaborn\r\nauthors: Иванова Анна; Глеб Кузнецов\r\nlesson: 2\r\ntags: plots, #Viz\r\n---\r\n## Установка\r\n',
    );
    expect(meta).toEqual({
      title: 'Seaborn: графики',
      library: 'seaborn',
      authors: ['Иванова Анна', 'Глеб Кузнецов'],
      group: undefined,
      lesson: 2,
      tags: ['plots', 'viz'],
      summary: '',
      body: '## Установка',
    });
  });

  it('falls back to the first heading and the file name', () => {
    const meta = parseReportFile('django_intro.md', '# Django за вечер\n\nТекст');
    expect(meta.title).toBe('Django за вечер');
    expect(meta.library).toBe('django');
    expect(meta.body).toBe('Текст');
    expect(meta.authors).toEqual([]);
  });

  it('ignores a nonsense lesson number', () => {
    expect(parseReportFile('a.md', '---\nlesson: two\n---\nx').lesson).toBeUndefined();
  });
});

describe('localImageRefs', () => {
  it('finds relative images, including <paths with spaces>, and skips remote/unsafe ones', () => {
    const md = [
      '![a](plot.png)',
      '![b](<img/Graph Plot.png> "title")',
      '![c](./img/c.webp)',
      '![d](https://example.com/x.png)',
      '![e](../secret.png)',
      '![f](/etc/passwd)',
      '![a again](plot.png)',
    ].join('\n');
    expect(localImageRefs(md)).toEqual(['plot.png', 'img/Graph Plot.png', 'img/c.webp']);
  });
});

describe('matching helpers', () => {
  it('matches names regardless of order, case and ё', () => {
    expect(nameKey('Иванова Анна')).toBe(nameKey('анна  ИВАНОВА'));
    expect(nameKey('Фёдоров Пётр')).toBe(nameKey('Петр Федоров'));
  });

  it('does not repeat the library in report slugs', () => {
    expect(reportSlugBase('seaborn', 'Seaborn: графики')).toBe('seaborn-grafiki');
    expect(reportSlugBase('NumPy', 'Массивы без циклов')).toBe('numpy-massivy-bez-tsiklov');
    expect(reportSlugBase('', '')).toBe('report');
  });
});
