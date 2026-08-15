import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, getDictionary, type Locale } from '@/lib/i18n';

/** Server-only. Reads the locale cookie, falling back to Arabic. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Convenience for server components and actions. */
export async function getT() {
  const locale = await getLocale();
  return { locale, d: getDictionary(locale) };
}
