import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import TopBar from '@/components/TopBar';
import CancelBookingButton from '@/components/CancelBookingButton';

export const dynamic = 'force-dynamic';

export default async function MyBookingsPage() {
  const user = await requireUser();

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
              <h1>My bookings</h1>
              <p className="muted mt-2">Your upcoming and past sessions.</p>
            </div>
            <Link href="/courses" className="btn btn-primary">
              Book a session
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="card empty">
              <h3>Nothing booked yet</h3>
              <p>Browse the courses and pick a time that works for you.</p>
              <Link href="/courses" className="btn btn-primary mt-4">
                See courses
              </Link>
            </div>
          ) : (
            <div className="stack">
              <div className="card">
                <div className="section-title">
                  <h3>Upcoming</h3>
                  <span className="muted small">{upcoming.length}</span>
                </div>
                {upcoming.length === 0 ? (
                  <p className="muted">No upcoming sessions.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Course</th>
                          <th>When</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {upcoming.map((b) => (
                          <tr key={b.id}>
                            <td>{b.reference}</td>
                            <td>{b.course.title}</td>
                            <td>{formatDateTime(b.slot.startsAt)}</td>
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
                    <h3>Past and cancelled</h3>
                    <span className="muted small">{past.length}</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Course</th>
                          <th>When</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {past.map((b) => (
                          <tr key={b.id}>
                            <td>{b.reference}</td>
                            <td>{b.course.title}</td>
                            <td>{formatDateTime(b.slot.startsAt)}</td>
                            <td>
                              {b.status === 'CANCELLED' ? (
                                <span className="pill pill-danger">Cancelled</span>
                              ) : (
                                <span className="pill pill-muted">Completed</span>
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
