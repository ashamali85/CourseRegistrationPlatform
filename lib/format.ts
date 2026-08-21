import { APP_TIMEZONE } from '@/lib/env';
import { DEFAULT_LOCALE, intlTag, type Locale } from '@/lib/i18n';

/**
 * Server and client both format through these helpers with an explicit time
 * zone, so rendered times never differ between SSR and hydration.
 */
/**
 * Times always render as "8:00 PM" in English, in every locale. Arabic would
 * otherwise produce "م"/"ص" for the day period, and the requirement is AM/PM
 * with Latin digits throughout. Dates stay localised — only the clock is fixed.
 */
export function formatTime(value: Date | string, _locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  const date = new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
  return `${date}, ${formatTime(value, locale)}`;
}

export function formatDate(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

/**
 * YYYY-MM-DD in APP_TIMEZONE — used to bucket slots into calendar days.
 * Deliberately locale-independent: this is a key, not display text.
 */
export function dayKey(value: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

/**
 * Format a CourseDay.date. Forced to UTC because the value is a date key, not
 * an instant — formatting it in APP_TIMEZONE would render the wrong day.
 */
export function formatDateKey(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatDateKeyShort(
  value: Date | string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

/** Weekday alone, e.g. "Sun" / "الأحد". Date keys are formatted in UTC. */
export function formatWeekday(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: 'UTC',
    weekday: 'short'
  }).format(new Date(value));
}

/** Day and month alone, e.g. "17 Aug". Split from the weekday so the
 *  timetable header can stack them without slicing a formatted string. */
export function formatDayMonth(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

export function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}
