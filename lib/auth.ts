import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import { getJwtSecret } from '@/lib/env';

const COOKIE_NAME = 'course_platform_session';
const BCRYPT_ROUNDS = 12;

/**
 * A dummy hash of a random string. When an email does not exist we still run
 * bcrypt.compare against this so a failed login costs the same time whether or
 * not the account is real — otherwise response timing enumerates your users.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.WHnFvvNvXqYbEAJMlIVXfOTHqQ9jvBu';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Role = 'ADMIN' | 'STUDENT';

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
}): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Verify an email/password pair. Returns the session user or null, and never
 * reveals which half was wrong.
 */
export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user || !user.isActive) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return toSessionUser(user);
}

export async function createSession(user: Pick<SessionUser, 'id'>) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read the current session. The token carries ONLY the user id — role and
 * active status are looked up fresh from the database on every request, so
 * deactivating a user or changing their role takes effect immediately rather
 * than whenever their week-old token happens to expire.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const sub = payload.sub;
    if (typeof sub !== 'string' || !sub) return null;
    userId = sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toSessionUser(user);
}

/**
 * The authoritative guard. Middleware only checks the signature at the edge to
 * bounce obvious anonymous traffic; it is NOT the security boundary. Every page
 * and every server action calls this (or requireAdmin) itself.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/courses');
  return user;
}

/**
 * Action-safe variants: these throw instead of redirecting, so a server action
 * returns a clean error to the form rather than a redirect the client may not
 * expect.
 */
export async function requireUserAction(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('Your session has expired. Sign in again.');
  return user;
}

export async function requireAdminAction(): Promise<SessionUser> {
  const user = await requireUserAction();
  if (user.role !== 'ADMIN') throw new Error('You do not have access to this action.');
  return user;
}

export { COOKIE_NAME };
