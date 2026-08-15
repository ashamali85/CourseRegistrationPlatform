'use client';

import { createContext, useContext } from 'react';
import { getDictionary, type Dictionary, type Locale } from '@/lib/i18n';

type I18nValue = { locale: Locale; d: Dictionary; rtl: boolean };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Server components read the dictionary directly; client components read it
 * from here. The resolved locale is passed down from the root layout so there
 * is exactly one source of truth and no hydration mismatch.
 */
export default function I18nProvider({
  locale,
  children
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value: I18nValue = {
    locale,
    d: getDictionary(locale),
    rtl: locale === 'ar'
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider.');
  return value;
}
