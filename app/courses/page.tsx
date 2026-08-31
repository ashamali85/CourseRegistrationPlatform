import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { startOfTodayUtc } from '@/lib/time';
import TopBar from '@/components/TopBar';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const user = await requireUser();
  const { d } = await getT();
  const now = startOfTodayUtc();

  // Students only ever see published courses.
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' },
    include: {
      // Only the leading image is needed here; it is the thumbnail.
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      days: {
        where: { slots: { some: { startsAt: { gte: now } } } },
        select: {
          slots: {
            where: { startsAt: { gte: now } },
            select: {
              capacity: true,
              _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }
            }
          }
        }
      }
    }
  });

  return (
    <>
      <TopBar user={user} />
      <div className="page">
        <div className="container">
          {!user.emailVerified && <VerifyEmailBanner email={user.email} />}

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
                const open = course.days.reduce(
                  (total, day) =>
                    total +
                    day.slots.filter((slot) => slot._count.bookings < slot.capacity).length,
                  0
                );
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="card">
                    {course.images[0] ? (
                      <img
                        className="course-thumb"
                        src={course.images[0].url}
                        alt={course.images[0].alt || course.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="course-thumb course-thumb-empty">{d.images.noImage}</div>
                    )}
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
                      {course.sessionHours}{' '}
                      {course.sessionHours === 1 ? d.schedule.hour : d.schedule.hours}
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
