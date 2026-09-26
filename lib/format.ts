const opts = { day: 'numeric', month: 'long', year: 'numeric' } as const;
const shortOpts = { day: 'numeric', month: 'short' } as const;

// DB `date` values ("2026-09-10") are calendar days: format in UTC so they never shift.
// Timestamps are instants: show them in the course's time zone.
const dayFmt = new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: 'UTC' });
const instantFmt = new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: 'Europe/Moscow' });
const shortDayFmt = new Intl.DateTimeFormat('ru-RU', { ...shortOpts, timeZone: 'UTC' });
const shortInstantFmt = new Intl.DateTimeFormat('ru-RU', {
  ...shortOpts,
  timeZone: 'Europe/Moscow',
});

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** `2026-09-10` → `10 сентября 2026 г.`; a timestamp → its date in Moscow time. */
export function formatDate(value: string): string {
  return isDay(value)
    ? dayFmt.format(new Date(`${value}T00:00:00Z`))
    : instantFmt.format(new Date(value));
}

export function formatShortDate(value: string): string {
  return isDay(value)
    ? shortDayFmt.format(new Date(`${value}T00:00:00Z`))
    : shortInstantFmt.format(new Date(value));
}

/** Russian plural: plural(5, ['задача', 'задачи', 'задач']) → 'задач'. */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
