import { isTurnstileConfigured } from '@/lib/turnstile';

/**
 * Who may create an account.
 *
 *   open   — anyone may sign up. Requires a working bot check.
 *   invite — only the instructor creates accounts, from Admin -> Students.
 *
 * The mode is DERIVED, not simply read: registration opens once Turnstile is
 * configured, and closes automatically if it is not. That ordering matters —
 * a public sign-up form on a live domain is found by bots within hours, and
 * every fake sign-up makes the platform email an address the bot chose. Making
 * "open" depend on the defence means the unprotected combination cannot happen
 * by forgetting a variable.
 */
export type RegistrationMode = 'open' | 'invite';

function forcedMode(): RegistrationMode | null {
  const raw = process.env.REGISTRATION_MODE?.trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '');
  if (raw === 'open' || raw === 'invite') return raw;
  return null;
}

export function registrationMode(): RegistrationMode {
  const forced = forcedMode();

  // Closing is always allowed, whatever else is configured.
  if (forced === 'invite') return 'invite';

  if (isTurnstileConfigured()) return 'open';

  if (forced === 'open') {
    console.warn(
      '[registration] REGISTRATION_MODE=open with no Turnstile keys — the sign-up form is unprotected.'
    );
    return 'open';
  }

  return 'invite';
}

export function isPublicRegistrationOpen(): boolean {
  return registrationMode() === 'open';
}

/**
 * Gmail ignores dots in the local part and everything after a '+', so a single
 * mailbox yields unlimited distinct-looking addresses — which is how one bot
 * produced several sign-ups here. Collapsing them gives one identity to check
 * duplicates against.
 */
export function normalizeEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  const at = cleaned.lastIndexOf('@');
  if (at < 1) return cleaned;

  const local = cleaned.slice(0, at);
  const domain = cleaned.slice(at + 1);

  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return cleaned;

  return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
}

/** Hidden field a human never sees and never fills. */
export const HONEYPOT_FIELD = 'company_website';
