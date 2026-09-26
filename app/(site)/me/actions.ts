'use server';

import { redirect } from 'next/navigation';
import { audit } from '@/lib/audit';
import { requireStudent } from '@/lib/auth/guards';
import { hashPin, verifyPassword } from '@/lib/auth/passwords';
import { formatLockTime, PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from '@/lib/auth/pin';
import { writeSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { limiter, RATE_RULES } from '@/lib/ratelimit';
import { clientIp } from '@/lib/request';
import { identifySchema } from '@/lib/validation/auth';

export type IdentifyState = { error: string | null };

export async function identify(_prev: IdentifyState, formData: FormData): Promise<IdentifyState> {
  const session = await requireStudent();
  const parsed = identifySchema.safeParse({
    studentId: formData.get('studentId'),
    pin: formData.get('pin'),
    pinConfirm: formData.get('pinConfirm') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Неверный ввод' };
  const { studentId, pin, pinConfirm } = parsed.data;

  const { data: student, error } = await db()
    .from('students')
    .select('id, pin_hash, pin_version')
    .eq('id', studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!student) return { error: 'Студент не найден' };

  let pinVersion = student.pin_version;

  if (student.pin_hash === null) {
    if (pin !== pinConfirm) return { error: 'PIN и подтверждение не совпадают' };
    const ip = await clientIp();
    const slot = await limiter.reserve(`pinsetup:${ip}`, RATE_RULES.pinSetup);
    if (!slot.allowed) {
      return {
        error: 'С этого устройства уже задано слишком много PIN. Обратитесь к преподавателю.',
      };
    }
    pinVersion = student.pin_version + 1;
    // `is null` guard: if two people race for the same name, only the first one wins.
    const { data: updated, error: updError } = await db()
      .from('students')
      .update({
        pin_hash: await hashPin(pin),
        pin_version: pinVersion,
        pin_failed_count: 0,
        pin_locked_until: null,
      })
      .eq('id', studentId)
      .is('pin_hash', null)
      .select('id');
    if (updError) {
      await slot.release();
      throw new Error(updError.message);
    }
    if (!updated?.length) {
      await slot.release();
      return { error: 'PIN для этого студента уже задан — введите его.' };
    }
    await audit({
      actor: `student:${studentId}`,
      action: 'pin.set',
      entity: 'student',
      entityId: studentId,
      meta: { ip },
    });
  } else {
    const { data: attempt, error: rpcError } = await db()
      .rpc('pin_attempt_begin', {
        p_student_id: studentId,
        p_max: PIN_MAX_ATTEMPTS,
        p_lock: `${PIN_LOCK_MINUTES} minutes`,
      })
      .single();
    if (rpcError) throw new Error(rpcError.message);
    if (!attempt.allowed) {
      // Not allowed without a lock means the PIN was reset after we loaded the student.
      return {
        error: attempt.locked_until
          ? `Слишком много неверных попыток. PIN заблокирован до ${formatLockTime(attempt.locked_until)}.`
          : 'PIN был сброшен. Обновите страницу и задайте новый.',
      };
    }
    if (!(await verifyPassword(pin, student.pin_hash))) {
      if (attempt.locked_until) {
        await audit({
          actor: 'anonymous',
          action: 'pin.locked',
          entity: 'student',
          entityId: studentId,
        });
        return { error: `Неверный PIN. Вход заблокирован на ${PIN_LOCK_MINUTES} минут.` };
      }
      return { error: `Неверный PIN. Осталось попыток: ${attempt.attempts_left}.` };
    }
    const { error: okError } = await db().rpc('pin_attempt_success', { p_student_id: studentId });
    if (okError) throw new Error(okError.message);
  }

  // If the PIN is reset after this point, pinVersion no longer matches and guards drop the identity.
  await writeSessionCookie({
    role: 'student',
    pwdVersion: session.pwdVersion,
    studentId,
    pinVersion,
  });
  redirect('/me');
}

export async function forgetIdentity(): Promise<void> {
  const session = await requireStudent();
  await writeSessionCookie({ role: 'student', pwdVersion: session.pwdVersion });
  redirect('/me');
}
