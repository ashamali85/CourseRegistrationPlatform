import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { startOfTodayUtc } from '@/lib/time';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const user = await requireUser();
  const { d } = await getT();
  const now = startOfTodayUtc();

  // Students only ever see published courses.
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' }
  });

  // Count upcoming slots open to each course (its own + the "any course" ones).
  const openSlots = await prisma.availabilitySlot.findMany({
    where: { startsAt: { gte: now } },
    select: { id: true, courseId: true, capacity: true }
  });

  const bookedCounts = await prisma.booking.groupBy({
    by: ['slotId'],
    where: { status: 'CONFIRMED' },
    _count: { _all: true }
  });
  const bookedBySlot = new Map(bookedCounts.map((b) => [b.slotId, b._count._all]));

  const availableFor = (courseId: string) =>
    openSlots.filter(
      (s) =>
        (s.courseId === null || s.courseId === courseId) &&
        (bookedBySlot.get(s.id) ?? 0) < s.capacity
    ).length;

  return (
    <>
      <TopBar user={user} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.courses.title}</h1>
              <p className="muted mt-2">{d.courses.subtitle}</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="card empty">
              <h3>{d.courses.emptyTitle}</h3>
              <p>{d.courses.emptyBody}</p>
            </div>
          ) : (
            <div className="grid-cards">
              {courses.map((course) => {
                const open = availableFor(course.id);
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="card">
                    <div className="row-between wrap">
                      <h3>{course.title}</h3>
                      {open > 0 ? (
                        <span className="pill pill-ok">
                          {open} {d.courses.timesOpen}
                        </span>
                      ) : (
                        <span className="pill pill-muted">{d.courses.noTimesYet}</span>
                      )}
                    </div>
                    {course.summary && <p className="muted small mt-2">{course.summary}</p>}
                    <p className="muted small mt-4">
                      {course.durationMinutes} {d.courses.minuteSession}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
