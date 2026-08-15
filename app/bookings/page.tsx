import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';
import CancelBookingButton from '@/components/CancelBookingButton';

export const dynamic = 'force-dynamic';

export default async function MyBookingsPage() {
  const user = await requireUser();
  const { locale, d } = await getT();

  // Scoped to the signed-in user by userId — never by a value from the request.
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { course: true, slot: true },
    orderBy: { slot: { startsAt: 'asc' } }
  });

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => b.status === 'CONFIRMED' && b.slot.startsAt.getTime() > now
  );
  const past = bookings.filter(
    (b) => b.status !== 'CONFIRMED' || b.slot.startsAt.getTime() <= now
  );

  return (
    <>
      <TopBar user={user} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.bookings.title}</h1>
              <p className="muted mt-2">{d.bookings.subtitle}</p>
            </div>
            <Link href="/courses" className="btn btn-primary">
              {d.bookings.bookSession}
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="card empty">
              <h3>{d.bookings.emptyTitle}</h3>
              <p>{d.bookings.emptyBody}</p>
              <Link href="/courses" className="btn btn-primary mt-4">
                {d.bookings.seeCourses}
              </Link>
            </div>
          ) : (
            <div className="stack">
              <div className="card">
                <div className="section-title">
                  <h3>{d.bookings.upcoming}</h3>
                  <span className="muted small">{upcoming.length}</span>
                </div>
                {upcoming.length === 0 ? (
                  <p className="muted">{d.bookings.noUpcoming}</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{d.common.reference}</th>
                          <th>{d.common.course}</th>
                          <th>{d.common.when}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {upcoming.map((b) => (
                          <tr key={b.id}>
                            <td className="ltr-text">{b.reference}</td>
                            <td>{b.course.title}</td>
                            <td>{formatDateTime(b.slot.startsAt, locale)}</td>
                            <td>
                              <CancelBookingButton bookingId={b.id} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {past.length > 0 && (
                <div className="card">
                  <div className="section-title">
                    <h3>{d.bookings.pastAndCancelled}</h3>
                    <span className="muted small">{past.length}</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{d.common.reference}</th>
                          <th>{d.common.course}</th>
                          <th>{d.common.when}</th>
                          <th>{d.common.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {past.map((b) => (
                          <tr key={b.id}>
                            <td className="ltr-text">{b.reference}</td>
                            <td>{b.course.title}</td>
                            <td>{formatDateTime(b.slot.startsAt, locale)}</td>
                            <td>
                              {b.status === 'CANCELLED' ? (
                                <span className="pill pill-danger">{d.bookings.cancelled}</span>
                              ) : (
                                <span className="pill pill-muted">{d.bookings.completed}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
