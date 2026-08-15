import { APP_TIMEZONE } from '@/lib/env';
import { DEFAULT_LOCALE, intlTag, type Locale } from '@/lib/i18n';

/**
 * Server and client both format through these helpers with an explicit time
 * zone, so rendered times never differ between SSR and hydration.
 */
export function formatDateTime(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
}

export function formatTime(value: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
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

export function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}
