import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import TopBar from '@/components/TopBar';
import CancelBookingButton from '@/components/CancelBookingButton';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const admin = await requireAdmin();

  const bookings = await prisma.booking.findMany({
    include: { course: true, slot: true, user: true },
    orderBy: { slot: { startsAt: 'desc' } },
    take: 200
  });

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>Bookings</h1>
              <p className="muted mt-2">Most recent 200 bookings.</p>
            </div>
          </div>

          <div className="card">
            {bookings.length === 0 ? (
              <div className="empty">
                <h3>No bookings yet</h3>
                <p>They will appear here as soon as students start booking.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>When</th>
                      <th>Course</th>
                      <th>Student</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.reference}</td>
                        <td>{formatDateTime(b.slot.startsAt)}</td>
                        <td>{b.course.title}</td>
                        <td>
                          {b.user.name}
                          <br />
                          <span className="muted small">{b.user.email}</span>
                        </td>
                        <td>
                          {b.status === 'CONFIRMED' ? (
                            <span className="pill pill-ok">Confirmed</span>
                          ) : (
                            <span className="pill pill-danger">Cancelled</span>
                          )}
                        </td>
                        <td>
                          {b.status === 'CONFIRMED' && (
                            <CancelBookingButton bookingId={b.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
