import { describe, expect, it } from 'vitest';
import { identifySchema, pinSchema, safeNextPath } from '@/lib/validation/auth';

describe('safeNextPath', () => {
  it.each([
    ['/kb?tag=numpy', '/kb?tag=numpy'],
    ['/admin', '/admin'],
    [undefined, '/'],
    ['', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['javascript:alert(1)', '/'],
    ['/\t/evil.example', '/'],
    ['/\n/evil.example', '/'],
    ['/a\\b', '/'],
    ['/login?next=%2Fkb', '/login?next=%2Fkb'],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe('pinSchema', () => {
  it.each(['1234', '123456'])('accepts %s', (pin) => {
    expect(pinSchema.safeParse(pin).success).toBe(true);
  });
  it.each(['123', '1234567', '12a4', ' 1234', ''])('rejects %j', (pin) => {
    expect(pinSchema.safeParse(pin).success).toBe(false);
  });
});

describe('identifySchema', () => {
  it('coerces the student id from form data', () => {
    expect(identifySchema.parse({ studentId: '5', pin: '1234' }).studentId).toBe(5);
  });
  it('rejects an empty selection', () => {
    expect(identifySchema.safeParse({ studentId: '', pin: '1234' }).success).toBe(false);
  });
});
