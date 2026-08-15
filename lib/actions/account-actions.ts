'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  requireUserAction,
  hashPassword,
  verifyPassword,
  createSession,
  passwordChangeStamp
} from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { changePasswordSchema, fieldErrors } from '@/lib/validation';
import { getT } from '@/lib/locale';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // The one action a user with mustChangePassword is allowed to reach.
  const session = await requireUserAction({ allowPendingPasswordChange: true });
  const { d } = await getT();

  const ip = clientIp(await headers());
  const limit = rateLimit(`change-password:${session.id}:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `${d.errors.tooManyAttempts} ${limit.retryAfterSeconds}${d.errors.seconds}`
    };
  }

  const parsed = changePasswordSchema(d).safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword')
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return { error: d.errors.sessionExpired };

  // Re-verify the current password even though they hold a valid session, so a
  // hijacked session cannot lock the real owner out by changing the password.
  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { fieldErrors: { currentPassword: d.errors.notCurrentPassword } };
  }

  const changedAt = passwordChangeStamp();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      passwordChangedAt: changedAt
    }
  });

  await recordAudit({
    actorUserId: user.id,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: user.id,
    entityName: user.email
  });

  // Every token issued before changedAt is now rejected, including this one —
  // so mint a fresh session for the device that made the change.
  await createSession({ id: user.id });

  redirect(user.role === 'ADMIN' ? '/admin' : '/courses');
}
