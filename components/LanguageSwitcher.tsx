import { setLocaleAction } from '@/lib/actions/locale-actions';
import { getDictionary, type Locale } from '@/lib/i18n';

/**
 * Server component — a plain form post, so switching language works without
 * JavaScript and survives a full reload.
 */
export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const next: Locale = locale === 'ar' ? 'en' : 'ar';
  const d = getDictionary(locale);

  return (
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={next} />
      <button type="submit" lang={next} title={d.common.language}>
        {d.otherLocaleName}
      </button>
    </form>
  );
}
