import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { startOfTodayUtc } from '@/lib/time';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const { locale, d } = await getT();
  const now = startOfTodayUtc();

  const [courseCount, publishedCount, upcomingSlots, confirmedCount, studentCount, nextSessions] =
    await Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.availabilitySlot.count({ where: { startsAt: { gte: now } } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', slot: { startsAt: { gte: now } } },
        include: { course: true, slot: true, user: true },
        orderBy: { slot: { startsAt: 'asc' } },
        take: 8
      })
    ]);

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.admin.dashboard}</h1>
              <p className="muted mt-2">
                {d.account.signedInAs} <span className="ltr-text">{admin.email}</span>
              </p>
            </div>
          </div>

          <div className="grid-3">
            <div className="card">
              <p className="muted small">{d.admin.coursesStat}</p>
              <h2 className="mt-2">{courseCount}</h2>
              <p className="muted small mt-2">
                {publishedCount} {d.admin.publishedStat}
              </p>
            </div>
            <div className="card">
              <p className="muted small">{d.admin.upcomingSlots}</p>
              <h2 className="mt-2">{upcomingSlots}</h2>
              <p className="muted small mt-2">
                {studentCount} {d.admin.registeredStudents}
              </p>
            </div>
            <div className="card">
              <p className="muted small">{d.admin.confirmedBookings}</p>
              <h2 className="mt-2">{confirmedCount}</h2>
              <p className="muted small mt-2">{d.admin.allTime}</p>
            </div>
          </div>

          <div className="card mt-6">
            <div className="section-title">
              <h3>{d.admin.nextSessions}</h3>
              <Link href="/admin/bookings" className="btn btn-ghost btn-sm">
                {d.admin.allBookings}
              </Link>
            </div>

            {nextSessions.length === 0 ? (
              <div className="empty">
                <h3>{d.admin.noBookingsTitle}</h3>
                <p>{d.admin.noBookingsBody}</p>
                <div className="row mt-4" style={{ justifyContent: 'center' }}>
                  <Link href="/admin/courses" className="btn btn-primary">
                    {d.admin.manageCourses}
                  </Link>
                  <Link href="/admin/availability" className="btn btn-ghost">
                    {d.admin.setAvailability}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{d.common.when}</th>
                      <th>{d.common.course}</th>
                      <th>{d.common.student}</th>
                      <th>{d.common.reference}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextSessions.map((b) => (
                      <tr key={b.id}>
                        <td>{formatDateTime(b.slot.startsAt, locale)}</td>
                        <td>{b.course.title}</td>
                        <td>
                          {b.user.name}
                          <br />
                          <span className="muted small ltr-text">{b.user.email}</span>
                        </td>
                        <td className="ltr-text">{b.reference}</td>
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
