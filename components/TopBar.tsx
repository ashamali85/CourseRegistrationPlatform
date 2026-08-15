import Link from 'next/link';
import { logoutAction } from '@/lib/actions/auth-actions';
import type { SessionUser } from '@/lib/auth';

export default function TopBar({ user }: { user: SessionUser }) {
  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="topbar">
      <div className="container">
        <Link href={isAdmin ? '/admin' : '/courses'} className="brand-mark">
          <span className="brand-dot" />
          Course Booking
        </Link>

        <nav className="nav">
          {isAdmin ? (
            <>
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/courses">Courses</Link>
              <Link href="/admin/availability">Availability</Link>
              <Link href="/admin/bookings">Bookings</Link>
            </>
          ) : (
            <>
              <Link href="/courses">Courses</Link>
              <Link href="/bookings">My bookings</Link>
            </>
          )}
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
