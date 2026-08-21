import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { sendEmailSafely, appUrl } from '@/lib/email/send';
import { verifyEmailMessage } from '@/lib/email/templates';
import type { Locale } from '@/lib/i18n';

const TOKEN_TTL_HOURS = 24;

/** Only the hash is stored, so a database dump cannot verify anyone's address. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a fresh link and email it.
 *
 * Any outstanding tokens for the user are consumed first: asking for a new
 * link should invalidate the old one, or an intercepted earlier email stays
 * usable for a day.
 */
export async function sendVerificationEmail(params: {
  userId: string;
  email: string;
  name: string;
  locale: Locale;
}): Promise<void> {
  const raw = randomBytes(32).toString('base64url');

  await prisma.emailVerificationToken.updateMany({
    where: { userId: params.userId, usedAt: null },
    data: { usedAt: new Date() }
  });

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId: params.userId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)
    }
  });

  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(raw)}`;

  await sendEmailSafely(
    verifyEmailMessage({
      locale: params.locale,
      to: params.email,
      name: params.name,
      url
    })
  );
}

export type VerifyResult = 'verified' | 'already' | 'expired' | 'invalid';

/**
 * Consume a token. Single use and time limited; a token that has already been
 * spent reports 'invalid' rather than 'already', because only the user record
 * can say whether the address is genuinely confirmed.
 */
export async function consumeVerificationToken(raw: string): Promise<VerifyResult> {
  if (!raw || raw.length < 16) return 'invalid';

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true }
  });

  if (!record) return 'invalid';
  if (record.user.emailVerified) return 'already';
  if (record.usedAt) return 'invalid';
  if (record.expiresAt.getTime() < Date.now()) return 'expired';

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() }
    })
  ]);

  return 'verified';
}
