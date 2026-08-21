/**
 * Outbound email via Resend's REST API.
 *
 * Uses fetch rather than the SDK to avoid another dependency to pin and patch.
 *
 * If RESEND_API_KEY is not set, mail is logged to the server console instead of
 * failing. That matters on a live site: the platform must keep working before
 * the domain is verified, and a booking must never fail because a receipt
 * could not be sent.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || 'Course Booking <onboarding@resend.dev>';
}

/** Public base URL, used to build absolute links inside emails. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  // Vercel injects this on every deployment; it has no protocol.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — not sent. to=${message.to} subject="${message.subject}"`
    );
    console.warn(`[email] body:\n${message.text}`);
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo || process.env.EMAIL_REPLY_TO
          ? { reply_to: message.replyTo ?? process.env.EMAIL_REPLY_TO }
          : {})
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[email] Resend rejected the message (${response.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[email] send failed', error);
    return false;
  }
}

/**
 * Send without letting a failure break the caller.
 *
 * Every call site is a booking, cancellation or sign-up that has already
 * succeeded — the receipt is a courtesy, and losing it must not roll anything
 * back or surface an error to the user.
 */
export async function sendEmailSafely(message: EmailMessage): Promise<void> {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error('[email] unexpected failure', error);
  }
}

/** The instructor's address, used for the "someone booked" notifications. */
export function instructorEmail(): string | null {
  return process.env.ADMIN_EMAIL?.toLowerCase().trim() || null;
}
