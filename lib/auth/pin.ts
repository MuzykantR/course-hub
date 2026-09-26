// PIN lockout parameters. The counter itself is updated atomically in Postgres
// (pin_attempt_begin / pin_attempt_success, see supabase/migrations/*_pin_attempts.sql).

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

export function formatLockTime(lockedUntil: string): string {
  return new Date(lockedUntil).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}
