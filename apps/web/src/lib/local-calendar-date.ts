/**
 * Task due_date is stored as a Postgres DATE → `YYYY-MM-DD` string.
 * `new Date('YYYY-MM-DD')` is parsed as UTC midnight, which shifts the
 * displayed calendar day in timezones behind UTC. Use local calendar helpers instead.
 */

export function startOfLocalDayFromYmd(ymd: string): Date {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(NaN);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function formatShortMonthDayFromYmd(ymd: string): string {
  const d = startOfLocalDayFromYmd(ymd);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('default', { month: 'short' });
  return `${month} ${d.getDate()}`;
}

export function isYmdBeforeLocalToday(ymd: string): boolean {
  const due = startOfLocalDayFromYmd(ymd);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}
