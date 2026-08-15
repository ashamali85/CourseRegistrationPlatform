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
