import { describe, expect, it } from 'vitest';
import { formValues } from '@/lib/forms';
import { contentHash } from '@/lib/hash';
import { sniffImage } from '@/lib/images';
import { slugify, uniqueSlug } from '@/lib/slug';
import {
  importStudentsSchema,
  lessonSchema,
  passwordChangeSchema,
  solutionSchema,
  tagsField,
} from '@/lib/validation/admin';

describe('slugify', () => {
  it.each([
    ['Анна Иванова', 'anna-ivanova'],
    ['Щукин Юрий', 'shchukin-yuriy'],
    ['NumPy: массивы без циклов', 'numpy-massivy-bez-tsiklov'],
    ['  --Ёлка!! ', 'elka'],
    ['Группа 1', 'gruppa-1'],
    ['???', ''],
  ])('%s → %s', (input, expected) => expect(slugify(input)).toBe(expected));

  it('respects the length limit without a trailing dash', () => {
    expect(slugify('очень длинное название доклада', 10)).toBe('ochen-dlin');
    expect(slugify('очень длинное', 6)).toBe('ochen');
  });

  it('finds the first free variant', () => {
    expect(uniqueSlug('anna', [])).toBe('anna');
    expect(uniqueSlug('anna', ['anna', 'anna-2'])).toBe('anna-3');
    expect(uniqueSlug('', [])).toBe('item');
  });
});

describe('contentHash', () => {
  it('ignores line endings and outer whitespace', () => {
    expect(contentHash('a\r\nb\n')).toBe(contentHash('  a\nb'));
    expect(contentHash('a')).not.toBe(contentHash('b'));
  });
});

describe('sniffImage', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
  it('detects real formats', () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe('png');
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe('jpg');
    expect(sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))?.ext).toBe(
      'webp',
    );
  });
  it('rejects anything else, whatever the file is called', () => {
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
    expect(
      sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20)),
    ).toBeNull(); // AVI
  });
});

describe('admin schemas', () => {
  it('normalizes tags', () => {
    expect(tagsField.parse('#NumPy, arrays  two-pointers,numpy')).toEqual([
      'numpy',
      'arrays',
      'two-pointers',
    ]);
    expect(tagsField.safeParse('bad tag!').success).toBe(false);
    expect(
      tagsField.safeParse(Array.from({ length: 11 }, (_, i) => `t${i}`).join(',')).success,
    ).toBe(false);
  });

  it('imports a pasted numbered list, dropping blanks and duplicates', () => {
    const r = importStudentsSchema.parse({
      group_id: '1',
      names: '1. Иванова  Анна\n2) Петров Борис\n\nИванова Анна\n  Смирнова Вера ',
    });
    expect(r.names).toEqual(['Иванова Анна', 'Петров Борис', 'Смирнова Вера']);
  });

  it('reads multi-value form fields as arrays', () => {
    const fd = new FormData();
    fd.append('title', 'Урок');
    fd.append('groupIds', '1');
    fd.append('groupIds', '2');
    fd.append('$ACTION_ID_abc', '');
    const values = formValues(fd, ['groupIds', 'authorIds']);
    expect(values).toEqual({ title: 'Урок', groupIds: ['1', '2'], authorIds: [] });
    expect(lessonSchema.parse({ ...values, date: '2026-09-01', number: '3' }).groupIds).toEqual([
      1, 2,
    ]);
  });

  it('limits code size in bytes, not characters', () => {
    const base = { task_id: '1', author_student_id: '1', status: 'approved' };
    expect(solutionSchema.safeParse({ ...base, code: 'я'.repeat(10_000) }).success).toBe(true); // 20 000 B
    expect(solutionSchema.safeParse({ ...base, code: 'я'.repeat(10_300) }).success).toBe(false);
    expect(solutionSchema.safeParse({ ...base, code: '   ' }).success).toBe(false);
  });

  it('checks the password confirmation', () => {
    expect(
      passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'longenough' }).success,
    ).toBe(true);
    expect(
      passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different' }).success,
    ).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(
      false,
    );
  });
});
