'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useI18n } from '@/components/I18nProvider';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Renders the Turnstile challenge and injects a hidden
 * `cf-turnstile-response` input into the surrounding form.
 *
 * Explicit rendering is used rather than the auto-render class, because React
 * re-runs effects and the auto mode happily draws a second widget on top of
 * the first.
 */
export default function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const { locale } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !container.current || !window.turnstile) return;
    if (widgetId.current) return;

    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      theme: 'light',
      language: locale
    });

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [ready, siteKey, locale]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={container} className="turnstile-box" />
    </>
  );
}
