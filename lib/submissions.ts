import 'server-only';
import { db } from '@/lib/db/client';
import { getSettings } from '@/lib/db/settings';
import { limiter, RATE_RULES } from '@/lib/ratelimit';
import type { Reservation } from '@/lib/ratelimit-core';
import { submissionBlockReason } from './submissions-core';

export { HONEYPOT_FIELD, MAX_COAUTHORS, MAX_PENDING_PER_STUDENT } from './submissions-core';

/** Solutions + reports of this student that are still waiting for review. */
export async function pendingCount(studentId: number): Promise<number> {
  const [solutions, reports] = await Promise.all([
    db()
      .from('solutions')
      .select('id', { count: 'exact', head: true })
      .eq('author_student_id', studentId)
      .eq('status', 'pending'),
    db()
      .from('report_authors')
      .select('report_id, report:reports!inner(status)', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('report.status', 'pending'),
  ]);
  if (solutions.error) throw new Error(solutions.error.message);
  if (reports.error) throw new Error(reports.error.message);
  return (solutions.count ?? 0) + (reports.count ?? 0);
}

/** Settings switch, per-student block and queue size — the checks that need no reservation. */
export async function submissionPrecheck(studentId: number): Promise<string | null> {
  const [settings, student, pending] = await Promise.all([
    getSettings(),
    db().from('students').select('submissions_blocked').eq('id', studentId).single(),
    pendingCount(studentId),
  ]);
  if (student.error) throw new Error(student.error.message);
  return submissionBlockReason({
    submissionsOpen: settings.submissions_open,
    studentBlocked: student.data.submissions_blocked,
    pendingCount: pending,
  });
}

/**
 * Reserve the cooldown, per-student and per-IP daily slots together. Either all three are
 * taken, or none (already-taken ones are released) and the user gets the reason.
 */
export async function reserveSubmissionSlots(
  studentId: number,
  ip: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = [
    {
      key: `submitcd:${studentId}`,
      rule: RATE_RULES.submitCooldown,
      error: 'Между отправками нужна минута. Попробуйте чуть позже.',
    },
    {
      key: `submit:student:${studentId}`,
      rule: RATE_RULES.submitStudent,
      error: 'Лимит на сегодня исчерпан: не больше 10 заявок в сутки.',
    },
    {
      key: `submit:ip:${ip}`,
      rule: RATE_RULES.submitIp,
      error: 'С этого устройства сегодня отправлено слишком много заявок.',
    },
  ];
  const taken: Reservation[] = [];
  for (const step of plan) {
    const r = await limiter.reserve(step.key, step.rule);
    if (!r.allowed) {
      await Promise.all(taken.map((t) => t.release()));
      return { ok: false, error: step.error };
    }
    taken.push(r);
  }
  return { ok: true };
}
