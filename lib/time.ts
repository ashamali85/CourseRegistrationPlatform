import { APP_TIMEZONE } from '@/lib/env';

/**
 * Interpret "YYYY-MM-DD" + "HH:mm" as a wall-clock time in `timeZone` and
 * return the corresponding UTC instant.
 *
 * Everything is stored in UTC; only input and display are zoned. APP_TIMEZONE
 * defaults to Asia/Kuwait, which has no DST, so the offset lookup below is
 * exact. In a DST zone it is still correct except for times that fall inside
 * the one ambiguous hour of a transition.
 */
export function zonedInputToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = APP_TIMEZONE
): Date {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(naive.getTime())) {
    throw new Error('Invalid date or time.');
  }
  const zoned = new Date(naive.toLocaleString('en-US', { timeZone }));
  const utc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = zoned.getTime() - utc.getTime();
  return new Date(naive.getTime() - offsetMs);
}

export const SESSION_HOURS = [1, 2, 3] as const;
export type SessionHours = (typeof SESSION_HOURS)[number];

/**
 * A CourseDay.date is a pure calendar-date KEY, not an instant: midnight UTC of
 * the literal YYYY-MM-DD the admin clicked. It is deliberately NOT run through
 * zonedInputToUtc — applying an offset to a date key is exactly how a schedule
 * silently shifts by a day.
 */
export function dateKeyToUtc(dateStr: string): Date {
  const value = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) throw new Error('Invalid date.');
  return value;
}

/** Inverse of dateKeyToUtc — read the key back as YYYY-MM-DD. */
export function utcToDateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Today's date key in APP_TIMEZONE. */
export function todayKey(timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/** Every date key from start to end inclusive. Used by range selection. */
export function dateKeyRange(startKey: string, endKey: string): string[] {
  const start = dateKeyToUtc(startKey);
  const end = dateKeyToUtc(endKey);
  const [from, to] = start <= end ? [start, end] : [end, start];

  const out: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push(utcToDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Start of "today" in APP_TIMEZONE, as a UTC instant. */
export function startOfTodayUtc(timeZone: string = APP_TIMEZONE): Date {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  return zonedInputToUtc(today, '00:00', timeZone);
}
