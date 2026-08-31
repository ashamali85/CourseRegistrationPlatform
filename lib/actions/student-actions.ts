'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdminAction, hashPassword, passwordChangeStamp } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';
import { emailSchema, idSchema, fieldErrors } from '@/lib/validation';
import { normalizeEmail } from '@/lib/registration';
import { sendEmailSafely, appUrl } from '@/lib/email/send';
import { inviteStudentMessage } from '@/lib/email/templates';
import type { Dictionary } from '@/lib/i18n';

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function inviteSchema(d: Dictionary) {
  return z.object({
    name: z.string().trim().min(2, d.validation.enterName).max(80, d.validation.nameTooLong),
    email: emailSchema(d)
  });
}

/**
 * Create a student account and email them a one-time password.
 *
 * The address is marked verified immediately: the instructor typed it, which
 * is a stronger signal than a click-through, and the invitation itself proves
 * the mailbox receives mail.
 */
export async function inviteStudentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const parsed = inviteSchema(d).safeParse({
    name: formData.get('name'),
    email: formData.get('email')
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { name, email } = parsed.data;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { email: normalizeEmail(email) }] },
    select: { id: true }
  });
  if (clash) return { fieldErrors: { email: d.errors.emailExists } };

  // Generated here, shown to nobody, and dead as soon as they set their own.
  const tempPassword = randomBytes(9).toString('base64url');

  try {
    const student = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(tempPassword),
        role: 'STUDENT',
        isActive: true,
        emailVerified: new Date(),
        mustChangePassword: true,
        passwordChangedAt: passwordChangeStamp()
      }
    });

    await recordAudit({
      actorUserId: admin.id,
      action: 'INVITE_STUDENT',
      entityType: 'User',
      entityId: student.id,
      entityName: student.email
    });

    await sendEmailSafely(
      inviteStudentMessage({
        locale,
        to: student.email,
        name: student.name,
        tempPassword,
        url: `${appUrl()}/login`
      })
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { fieldErrors: { email: d.errors.emailExists } };
    }
    console.error('invite failed', error);
    return { error: d.errors.genericFailure };
  }

  revalidatePath('/admin/students');
  return { ok: true, message: fill(d.students.invited, { email }) };
}

/**
 * Deactivating is preferred over deleting: bookings and audit history stay
 * intact, and getSessionUser rejects the account on the very next request.
 */
export async function setStudentActiveAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownRecord };

  const active = formData.get('active') === 'true';

  const student = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!student) return { error: d.errors.unknownRecord };
  if (student.role === 'ADMIN') return { error: d.students.cannotChangeAdmin };

  await prisma.user.update({
    where: { id: student.id },
    data: { isActive: active }
  });

  await recordAudit({
    actorUserId: admin.id,
    action: active ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
    entityType: 'User',
    entityId: student.id,
    entityName: student.email
  });

  revalidatePath('/admin/students');
  return {
    ok: true,
    message: active ? d.students.activated : d.students.deactivated
  };
}

/**
 * Remove an account that never confirmed its address and never booked.
 *
 * This is the cleanup for automated sign-ups. It refuses anything with a
 * booking or a verified address, so it cannot take a real student with it.
 */
export async function deleteUnverifiedStudentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownRecord };

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    include: { _count: { select: { bookings: true } } }
  });
  if (!student) return { error: d.errors.unknownRecord };

  if (student.role === 'ADMIN') return { error: d.students.cannotChangeAdmin };
  if (student.emailVerified || student._count.bookings > 0) {
    return { error: d.students.cannotDeleteReal };
  }

  await prisma.user.delete({ where: { id: student.id } });

  await recordAudit({
    actorUserId: admin.id,
    action: 'DELETE_UNVERIFIED',
    entityType: 'User',
    entityId: student.id,
    entityName: student.email
  });

  revalidatePath('/admin/students');
  return { ok: true, message: fill(d.students.deleted, { email: student.email }) };
}
