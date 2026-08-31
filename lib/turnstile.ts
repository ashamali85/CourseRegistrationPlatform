/**
 * Cloudflare Turnstile — a bot check that is invisible to most real users.
 *
 * The widget produces a token in the browser; that token means nothing until
 * it is verified server-side against Cloudflare, which is what this does. A
 * client-side widget on its own stops no one: a bot posts straight to the
 * server action and never loads the page.
 */
const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

function turnstileSecret(): string | null {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null;
}

/** Both halves are needed; one without the other is a misconfiguration. */
export function isTurnstileConfigured(): boolean {
  return Boolean(turnstileSiteKey() && turnstileSecret());
}

export type TurnstileResult = 'ok' | 'missing' | 'failed' | 'unconfigured';

export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = turnstileSecret();
  if (!secret) return 'unconfigured';

  if (typeof token !== 'string' || token.length === 0) return 'missing';
  // Cloudflare caps tokens well below this; anything larger is junk.
  if (token.length > 2048) return 'failed';

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);

    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) {
      console.error(`[turnstile] verify endpoint returned ${response.status}`);
      return 'failed';
    }

    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (data.success) return 'ok';
    console.warn('[turnstile] rejected:', data['error-codes']?.join(', ') ?? 'unknown');
    return 'failed';
  } catch (error) {
    // A network failure here must not become an open door: fail closed.
    console.error('[turnstile] verification error', error);
    return 'failed';
  }
}
