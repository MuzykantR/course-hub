// Pure anti-abuse rules for student submissions (no I/O, unit-tested).

export const MAX_PENDING_PER_STUDENT = 3;
export const MAX_COAUTHORS = 3;
/** Name of the hidden honeypot input: people never fill it, naive bots do. */
export const HONEYPOT_FIELD = 'website';

export type SubmissionContext = {
  submissionsOpen: boolean;
  studentBlocked: boolean;
  pendingCount: number;
};

/** Why a student can't submit right now, or null when they can. */
export function submissionBlockReason(ctx: SubmissionContext): string | null {
  if (!ctx.submissionsOpen) return 'Приём заявок сейчас закрыт преподавателем.';
  if (ctx.studentBlocked) return 'Отправка заявок для вас отключена. Обратитесь к преподавателю.';
  if (ctx.pendingCount >= MAX_PENDING_PER_STUDENT) {
    return `У вас уже ${ctx.pendingCount} заявки на проверке — дождитесь решения по ним.`;
  }
  return null;
}

export function isHoneypotFilled(value: FormDataEntryValue | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
