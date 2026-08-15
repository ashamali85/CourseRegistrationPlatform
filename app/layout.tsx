import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { getDictionary, isRtl } from '@/lib/i18n';
import I18nProvider from '@/components/I18nProvider';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const d = getDictionary(await getLocale());
  return { title: d.meta.title, description: d.meta.description };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const rtl = isRtl(locale);

  return (
    // lang and dir on <html> are what make flexbox, grid, logical CSS
    // properties and the browser's own bidi handling mirror themselves. Almost
    // no per-component RTL code is needed because of this one attribute.
    <html lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Kufi+Arabic:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={rtl ? 'is-rtl' : undefined}>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
