import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';
import CancelBookingButton from '@/components/CancelBookingButton';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const admin = await requireAdmin();
  const { locale, d } = await getT();

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
              <h1>{d.admin.bookingsTitle}</h1>
              <p className="muted mt-2">{d.admin.bookingsSubtitle}</p>
            </div>
          </div>

          <div className="card">
            {bookings.length === 0 ? (
              <div className="empty">
                <h3>{d.admin.noBookingsYet}</h3>
                <p>{d.admin.noBookingsYetBody}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{d.common.reference}</th>
                      <th>{d.common.when}</th>
                      <th>{d.common.course}</th>
                      <th>{d.common.student}</th>
                      <th>{d.common.status}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="ltr-text">{b.reference}</td>
                        <td>{formatDateTime(b.slot.startsAt, locale)}</td>
                        <td>{b.course.title}</td>
                        <td>
                          {b.user.name}
                          <br />
                          <span className="muted small ltr-text">{b.user.email}</span>
                        </td>
                        <td>
                          {b.status === 'CONFIRMED' ? (
                            <span className="pill pill-ok">{d.bookings.confirmed}</span>
                          ) : (
                            <span className="pill pill-danger">{d.bookings.cancelled}</span>
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
