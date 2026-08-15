let cachedSecret: Uint8Array | null = null;

/**
 * Fail fast: a missing or short JWT_SECRET must never silently degrade into an
 * unsigned or weakly-signed session.
 */
export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.trim().length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set it to a random value of at least 32 characters (openssl rand -base64 48).'
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

/** All times are stored UTC and rendered in this zone on both server and client. */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kuwait';
