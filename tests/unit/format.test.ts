import { describe, expect, it } from 'vitest';
import { plainExcerpt, plural } from '@/lib/format';

describe('plainExcerpt', () => {
  it('takes the first paragraph and strips Markdown', () => {
    const md =
      '# Рекурсия\n\nБазовый случай и **стек** вызовов, [кэш](https://x.y) через `cache`.\n\nВторой абзац.';
    expect(plainExcerpt(md)).toBe('Базовый случай и стек вызовов, кэш через cache.');
  });

  it('skips code blocks and images', () => {
    expect(plainExcerpt('```py\nprint(1)\n```\n\n![схема](a.png) Текст')).toBe('Текст');
  });

  it('cuts long text at a word boundary', () => {
    expect(plainExcerpt('один два три четыре', 12)).toBe('один два…');
  });

  it('flattens inline math to plain text', () => {
    expect(plainExcerpt('Поиск за $O(\\log n)$, память $O(1)$.')).toBe(
      'Поиск за O(log n), память O(1).',
    );
    expect(plainExcerpt('Цикл $$i \\le n$$ шагов')).toBe('Цикл i le n шагов');
  });

  it('keeps underscores inside identifiers but drops _emphasis_', () => {
    expect(plainExcerpt('Кэш через `functools.lru_cache` и _мемоизацию_.')).toBe(
      'Кэш через functools.lru_cache и мемоизацию.',
    );
  });

  it('returns an empty string for empty input', () => {
    expect(plainExcerpt('')).toBe('');
  });
});

describe('plural', () => {
  it('picks Russian forms', () => {
    expect(plural(1, ['задача', 'задачи', 'задач'])).toBe('задача');
    expect(plural(3, ['задача', 'задачи', 'задач'])).toBe('задачи');
    expect(plural(11, ['задача', 'задачи', 'задач'])).toBe('задач');
  });
});
