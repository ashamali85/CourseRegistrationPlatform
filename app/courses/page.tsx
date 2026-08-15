import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { startOfTodayUtc } from '@/lib/time';
import TopBar from '@/components/TopBar';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const user = await requireUser();
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
              <h1>Available courses</h1>
              <p className="muted mt-2">Pick a course to see open times.</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="card empty">
              <h3>No courses published yet</h3>
              <p>Check back shortly — new sessions are added regularly.</p>
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
                        <span className="pill pill-ok">{open} times open</span>
                      ) : (
                        <span className="pill pill-muted">No times yet</span>
                      )}
                    </div>
                    {course.summary && <p className="muted small mt-2">{course.summary}</p>}
                    <p className="muted small mt-4">{course.durationMinutes} minute session</p>
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
