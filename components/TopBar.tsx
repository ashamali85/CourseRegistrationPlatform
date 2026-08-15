import Link from 'next/link';
import { logoutAction } from '@/lib/actions/auth-actions';
import { getT } from '@/lib/locale';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { SessionUser } from '@/lib/auth';

export default async function TopBar({ user }: { user: SessionUser }) {
  const { locale, d } = await getT();
  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="topbar">
      <div className="container">
        <Link href={isAdmin ? '/admin' : '/courses'} className="brand-mark">
          <span className="brand-dot" />
          {d.common.appName}
        </Link>

        <nav className="nav">
          {isAdmin ? (
            <>
              <Link href="/admin">{d.nav.dashboard}</Link>
              <Link href="/admin/courses">{d.nav.courses}</Link>
              <Link href="/admin/availability">{d.nav.availability}</Link>
              <Link href="/admin/bookings">{d.nav.bookings}</Link>
            </>
          ) : (
            <>
              <Link href="/courses">{d.nav.courses}</Link>
              <Link href="/bookings">{d.nav.myBookings}</Link>
            </>
          )}
          <Link href="/change-password">{d.nav.password}</Link>
          <LanguageSwitcher locale={locale} />
          <form action={logoutAction}>
            <button type="submit">{d.nav.signOut}</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
