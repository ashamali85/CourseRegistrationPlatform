import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { APP_TIMEZONE } from '@/lib/env';
import { dateKeyToUtc, todayKey } from '@/lib/time';
import { formatDateKeyShort } from '@/lib/format';
import TopBar from '@/components/TopBar';

export const dynamic = 'force-dynamic';

/**
 * Scheduling now lives per course, so this page is an overview: which courses
 * have a schedule, and a way into each one.
 */
export default async function AdminAvailabilityPage() {
  const admin = await requireAdmin();
  const { locale, d } = await getT();
  const from = dateKeyToUtc(todayKey());

  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    include: {
      days: {
        where: { date: { gte: from } },
        orderBy: { date: 'asc' },
        include: { _count: { select: { slots: true } } }
      }
    }
  });

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.admin.availabilityTitle}</h1>
              <p className="muted mt-2">
                {d.admin.timezoneNote} <span className="ltr-text">{APP_TIMEZONE}</span>
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="card empty">
              <h3>{d.admin.noCoursesTitle}</h3>
              <p>{d.admin.noCoursesBody}</p>
              <Link href="/admin/courses" className="btn btn-primary mt-4">
                {d.admin.manageCourses}
              </Link>
            </div>
          ) : (
            <div className="stack">
              {courses.map((course) => {
                const days = course.days;
                const times = days.reduce((n, day) => n + day._count.slots, 0);
                return (
                  <div key={course.id} className="card">
                    <div className="row-between wrap">
                      <div className="grow">
                        <div className="row wrap">
                          <h3>{course.title}</h3>
                          {course.isPublished ? (
                            <span className="pill pill-ok">{d.admin.published}</span>
                          ) : (
                            <span className="pill pill-muted">{d.admin.draft}</span>
                          )}
                        </div>
                        <p className="muted small mt-2">
                          {days.length === 0 ? (
                            d.schedule.noSchedule
                          ) : (
                            <>
                              {d.schedule.runsFrom}{' '}
                              {formatDateKeyShort(days[0].date, locale)} {d.schedule.to}{' '}
                              {formatDateKeyShort(days[days.length - 1].date, locale)} ·{' '}
                              {days.length} {d.schedule.daysCount} · {times}{' '}
                              {d.schedule.timesSet}
                            </>
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/admin/courses/${course.id}/schedule`}
                        className="btn btn-primary btn-sm"
                      >
                        {d.schedule.manageSchedule}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
