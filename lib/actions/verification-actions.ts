'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { requireUserAction } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { recordAudit } from '@/lib/audit';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email/verification';

export type ActionState = { ok?: boolean; message?: string; error?: string };

export async function resendVerificationAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const session = await requireUserAction();
  const { locale, d } = await getT();

  // Tighter than most limits: each attempt sends real mail, and a loose limit
  // here is a way to have the platform spam somebody else's inbox.
  const ip = clientIp(await headers());
  const limit = rateLimit(`verify:${session.id}:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `${d.errors.tooManyAttempts} ${limit.retryAfterSeconds}${d.errors.seconds}`
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: d.errors.sessionExpired };
  if (user.emailVerified) return { ok: true, message: d.verify.alreadyVerified };

  await sendVerificationEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    locale
  });

  await recordAudit({
    actorUserId: user.id,
    action: 'RESEND_VERIFICATION',
    entityType: 'User',
    entityId: user.id,
    entityName: user.email
  });

  return { ok: true, message: d.verify.sent };
}
