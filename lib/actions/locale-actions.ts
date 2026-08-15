'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale, DEFAULT_LOCALE } from '@/lib/i18n';

/**
 * Switch interface language. The locale is a display preference, not a
 * credential, so the cookie is readable by the client — but it is still
 * validated against the allowed list rather than written through, so a crafted
 * value cannot be reflected back into the markup.
 */
export async function setLocaleAction(formData: FormData) {
  const requested = formData.get('locale');
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });

  revalidatePath('/', 'layout');
}
