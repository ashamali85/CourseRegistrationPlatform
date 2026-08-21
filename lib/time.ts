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
 * The teaching window, in APP_TIMEZONE. 20:00 to 24:00 gives four one-hour
 * slots a day. Change these two numbers to widen it — the schedule grid, the
 * validation and the session-length options all derive from them.
 */
export const WORK_DAY_START_HOUR = 20;
export const WORK_DAY_END_HOUR = 24;

/** Every hour a session could begin on: 20, 21, 22, 23. */
export const WORK_DAY_HOURS = Array.from(
  { length: WORK_DAY_END_HOUR - WORK_DAY_START_HOUR },
  (_, i) => WORK_DAY_START_HOUR + i
);

/** "20:00" from 20 — the 24-hour value a <input type="time"> and the server expect. */
export function hourValue(hour: number): string {
  return `${String(hour % 24).padStart(2, '0')}:00`;
}

/** "8 PM" from 20, "12 AM" from 24. Display only — never posted. */
export function hourDisplay(hour: number): string {
  const h = hour % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${period}`;
}

/**
 * The hour of an instant as it reads in APP_TIMEZONE. hourCycle h23 is used
 * because h12/hour12:false renders midnight as 24 in some environments.
 */
export function hourInAppTz(value: Date | string, timeZone: string = APP_TIMEZONE): number {
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(value));
  return Number.parseInt(text, 10);
}

/** A session of `hours` starting at `hour` must finish by the end of the day. */
export function fitsInWorkDay(hour: number, hours: number): boolean {
  return hour >= WORK_DAY_START_HOUR && hour + hours <= WORK_DAY_END_HOUR;
}

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
