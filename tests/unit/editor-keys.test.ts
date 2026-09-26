import { describe, expect, it } from 'vitest';
import { onEnter, onTab } from '@/lib/python/editorKeys';
import { normalizeOutput, parseTaskTests } from '@/lib/python/protocol';

describe('editor keys', () => {
  it('Tab inserts four spaces at the caret', () => {
    expect(onTab('ab', 1, 1, false)).toEqual({
      value: 'a    b',
      selectionStart: 5,
      selectionEnd: 5,
    });
  });

  it('Tab indents every selected line', () => {
    const v = 'x = 1\ny = 2\nz = 3';
    const r = onTab(v, 2, 8, false); // selection spans lines 1–2
    expect(r.value).toBe('    x = 1\n    y = 2\nz = 3');
    expect(r.selectionStart).toBe(6);
    expect(r.selectionEnd).toBe(16); // end moves with the two inserted indents
  });

  it('Shift+Tab unindents up to four spaces per line', () => {
    const r = onTab('        a\n  b\nc', 0, 14, true);
    expect(r.value).toBe('    a\nb\nc');
  });

  it('Enter keeps the indent and adds a level after a colon', () => {
    expect(onEnter('    x = 1', 9, 9).value).toBe('    x = 1\n    ');
    const r = onEnter('def f():', 8, 8);
    expect(r.value).toBe('def f():\n    ');
    expect(r.selectionStart).toBe(13);
  });
});

describe('runner protocol', () => {
  it('compares output ignoring trailing spaces and blank lines', () => {
    expect(normalizeOutput('1 4  \r\n\n\n')).toBe(normalizeOutput('1 4'));
    expect(normalizeOutput('1\n2')).not.toBe(normalizeOutput('1 2'));
  });

  it('accepts valid tests and drops malformed ones entirely', () => {
    expect(parseTaskTests([{ type: 'io', name: 'a', expected: '5' }])).toEqual([
      { type: 'io', name: 'a', input: '', expected: '5' },
    ]);
    expect(parseTaskTests([{ type: 'shell', name: 'x', code: 'rm -rf /' }])).toEqual([]);
    expect(parseTaskTests(null)).toEqual([]);
  });
});
