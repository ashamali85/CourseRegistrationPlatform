import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { startOfTodayUtc } from '@/lib/time';
import TopBar from '@/components/TopBar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const admin = await requireAdmin();
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
              <h1>Dashboard</h1>
              <p className="muted mt-2">Signed in as {admin.email}</p>
            </div>
          </div>

          <div className="grid-3">
            <div className="card">
              <p className="muted small">Courses</p>
              <h2 className="mt-2">{courseCount}</h2>
              <p className="muted small mt-2">{publishedCount} published</p>
            </div>
            <div className="card">
              <p className="muted small">Upcoming slots</p>
              <h2 className="mt-2">{upcomingSlots}</h2>
              <p className="muted small mt-2">{studentCount} registered students</p>
            </div>
            <div className="card">
              <p className="muted small">Confirmed bookings</p>
              <h2 className="mt-2">{confirmedCount}</h2>
              <p className="muted small mt-2">All time</p>
            </div>
          </div>

          <div className="card mt-6">
            <div className="section-title">
              <h3>Next sessions</h3>
              <Link href="/admin/bookings" className="btn btn-ghost btn-sm">
                All bookings
              </Link>
            </div>

            {nextSessions.length === 0 ? (
              <div className="empty">
                <h3>Nothing booked yet</h3>
                <p>
                  Publish a course and add availability, then students can start booking.
                </p>
                <div className="row mt-4" style={{ justifyContent: 'center' }}>
                  <Link href="/admin/courses" className="btn btn-primary">
                    Manage courses
                  </Link>
                  <Link href="/admin/availability" className="btn btn-ghost">
                    Set availability
                  </Link>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Course</th>
                      <th>Student</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextSessions.map((b) => (
                      <tr key={b.id}>
                        <td>{formatDateTime(b.slot.startsAt)}</td>
                        <td>{b.course.title}</td>
                        <td>
                          {b.user.name}
                          <br />
                          <span className="muted small">{b.user.email}</span>
                        </td>
                        <td>{b.reference}</td>
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
