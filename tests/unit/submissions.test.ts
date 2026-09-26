import { describe, expect, it } from 'vitest';
import {
  isHoneypotFilled,
  MAX_PENDING_PER_STUDENT,
  submissionBlockReason,
} from '@/lib/submissions-core';
import { reportSubmitSchema, solutionSubmitSchema } from '@/lib/validation/submit';

describe('submissionBlockReason', () => {
  const ok = { submissionsOpen: true, studentBlocked: false, pendingCount: 0 };

  it('allows a normal submission', () => {
    expect(submissionBlockReason(ok)).toBeNull();
    expect(submissionBlockReason({ ...ok, pendingCount: MAX_PENDING_PER_STUDENT - 1 })).toBeNull();
  });

  it('blocks when submissions are closed, the student is blocked, or the queue is full', () => {
    expect(submissionBlockReason({ ...ok, submissionsOpen: false })).toMatch(/закрыт/);
    expect(submissionBlockReason({ ...ok, studentBlocked: true })).toMatch(/отключена/);
    expect(submissionBlockReason({ ...ok, pendingCount: MAX_PENDING_PER_STUDENT })).toMatch(
      /на проверке/,
    );
  });

  it('reports the closed switch first', () => {
    expect(
      submissionBlockReason({ submissionsOpen: false, studentBlocked: true, pendingCount: 99 }),
    ).toMatch(/закрыт/);
  });
});

describe('honeypot', () => {
  it('is empty for people and filled for bots', () => {
    expect(isHoneypotFilled(null)).toBe(false);
    expect(isHoneypotFilled('')).toBe(false);
    expect(isHoneypotFilled('   ')).toBe(false);
    expect(isHoneypotFilled('http://spam.example')).toBe(true);
  });
});

describe('submission schemas', () => {
  it('normalizes line endings and requires code', () => {
    const r = solutionSubmitSchema.parse({ task_id: '4', code: 'print(1)\r\n' });
    expect(r.code).toBe('print(1)\n');
    expect(r.explanation_md).toBeUndefined();
    expect(solutionSubmitSchema.safeParse({ task_id: '4', code: '\n  \n' }).success).toBe(false);
    expect(solutionSubmitSchema.safeParse({ task_id: '', code: 'x' }).success).toBe(false);
  });

  it('rejects code over 20 KB', () => {
    expect(
      solutionSubmitSchema.safeParse({ task_id: '1', code: 'x'.repeat(20 * 1024 + 1) }).success,
    ).toBe(false);
  });

  const report = {
    title: 'pandas за час',
    library: 'pandas',
    content_md: '# pandas\n\n' + 'Таблицы и группировки. '.repeat(5),
  };

  it('accepts a report and caps co-authors', () => {
    expect(reportSubmitSchema.safeParse(report).success).toBe(true);
    expect(reportSubmitSchema.safeParse({ ...report, coauthorIds: ['1', '2', '3'] }).success).toBe(
      true,
    );
    expect(
      reportSubmitSchema.safeParse({ ...report, coauthorIds: ['1', '2', '3', '4'] }).success,
    ).toBe(false);
  });

  it('rejects too-short or oversized reports', () => {
    expect(reportSubmitSchema.safeParse({ ...report, content_md: 'коротко' }).success).toBe(false);
    expect(
      reportSubmitSchema.safeParse({ ...report, content_md: 'я'.repeat(60_000) }).success,
    ).toBe(false);
  });
});
