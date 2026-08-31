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
import { sendVerificationEmail } from '@/lib/email/verification';
import {
  isPublicRegistrationOpen,
  normalizeEmail,
  HONEYPOT_FIELD
} from '@/lib/registration';
import { verifyTurnstile, isTurnstileConfigured } from '@/lib/turnstile';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { locale, d } = await getT();

  // Checked in the action, not only in the page: a server action is reachable
  // by anyone who can craft a POST, so hiding the form is not a control.
  if (!isPublicRegistrationOpen()) {
    return { error: d.auth.registrationClosed };
  }

  // A hidden field a real user never sees. Simple crawlers fill every input
  // they find, so this catches the cheapest bots before any network call.
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    console.warn('[register] honeypot triggered');
    return { error: d.errors.registerFailed };
  }

  const ip = clientIp(await headers());
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `${d.errors.tooManySignups} ${limit.retryAfterSeconds}${d.errors.seconds}`
    };
  }

  // Verified server-side. The widget alone protects nothing — a bot posts
  // straight to this action and never loads the page.
  if (isTurnstileConfigured()) {
    const captcha = await verifyTurnstile(formData.get('cf-turnstile-response'), ip);
    if (captcha === 'missing') return { error: d.auth.captchaRequired };
    if (captcha !== 'ok') return { error: d.auth.captchaFailed };
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

  // One Gmail mailbox can present as unlimited addresses via dots and +tags.
  // Reject a second sign-up that resolves to a mailbox already registered.
  const normalized = normalizeEmail(email);
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { email: normalized }] },
    select: { id: true }
  });
  if (clash) {
    return { fieldErrors: { email: d.errors.emailExists } };
  }

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

    // Failure to send must not fail the sign-up — the account exists, and the
    // banner on the next page offers a fresh link.
    await sendVerificationEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      locale
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
