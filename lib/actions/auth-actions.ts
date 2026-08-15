'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  authenticate,
  createSession,
  clearSession,
  hashPassword,
  getSessionUser
} from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { registerSchema, loginSchema, fieldErrors } from '@/lib/validation';
import { getT } from '@/lib/locale';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { d } = await getT();

  const ip = clientIp(await headers());
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `${d.errors.tooManySignups} ${limit.retryAfterSeconds}${d.errors.seconds}`
    };
  }

  const parsed = registerSchema(d).safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        // SECURITY: role is hard-coded, never read from formData. Without this
        // anyone could POST role=ADMIN and take over the platform.
        role: 'STUDENT',
        isActive: true
      }
    });

    await recordAudit({
      actorUserId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email
    });

    await createSession({ id: user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { fieldErrors: { email: d.errors.emailExists } };
    }
    console.error('register failed', error);
    return { error: d.errors.registerFailed };
  }

  redirect('/courses');
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { d } = await getT();

  const ip = clientIp(await headers());
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `${d.errors.tooManyAttempts} ${limit.retryAfterSeconds}${d.errors.seconds}`
    };
  }

  const parsed = loginSchema(d).safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    // Per-account limiter as well, so a botnet rotating IPs still cannot
    // grind one specific account.
    rateLimit(`login-account:${parsed.data.email}`, 10, 15 * 60 * 1000);
    return { error: d.errors.badCredentials };
  }

  await createSession({ id: user.id });
  await recordAudit({
    actorUserId: user.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    entityName: user.email
  });

  if (user.mustChangePassword) redirect('/change-password');
  redirect(user.role === 'ADMIN' ? '/admin' : '/courses');
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) {
    await recordAudit({
      actorUserId: user.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email
    });
  }
  await clearSession();
  redirect('/login');
}
