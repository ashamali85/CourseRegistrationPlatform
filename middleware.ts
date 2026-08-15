import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

/**
 * Cheap edge check ONLY: verifies the cookie signature so anonymous traffic is
 * bounced before it reaches a database-backed page. It deliberately does not
 * read roles — the token carries only a user id, and role is authoritative
 * only when read fresh from the database. Every page and server action calls
 * requireUser()/requireAdmin() itself. Middleware is never the boundary.
 */
const protectedPrefixes = ['/admin', '/courses', '/bookings', '/change-password'];

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.trim().length < 32) {
    throw new Error('JWT_SECRET is missing or too short (min 32 characters).');
  }
  return new TextEncoder().encode(raw);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get('course_platform_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('course_platform_session');
    return response;
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/courses/:path*',
    '/bookings/:path*',
    '/change-password'
  ]
};
