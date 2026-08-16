import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { utcToDateKey, todayKey, dateKeyToUtc } from '@/lib/time';
import { APP_TIMEZONE } from '@/lib/env';
import TopBar from '@/components/TopBar';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import DayScheduleEditor, { type ScheduleDay } from '@/components/DayScheduleEditor';

export const dynamic = 'force-dynamic';

export default async function CourseSchedulePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { d } = await getT();
  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  // Past days stay in the database for the booking history, but the editor
  // only shows from today forward — nobody schedules yesterday.
  const days = await prisma.courseDay.findMany({
    where: { courseId: course.id, date: { gte: dateKeyToUtc(todayKey()) } },
    orderBy: { date: 'asc' },
    include: {
      slots: {
        orderBy: { startsAt: 'asc' },
        include: {
          _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }
        }
      }
    }
  });

  const allDays = await prisma.courseDay.findMany({
    where: { courseId: course.id },
    select: {
      date: true,
      slots: {
        select: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } }
      }
    }
  });

  const initialDates = allDays.map((day) => utcToDateKey(day.date));
  const lockedDates = allDays
    .filter((day) => day.slots.some((slot) => slot._count.bookings > 0))
    .map((day) => utcToDateKey(day.date));

  const scheduleDays: ScheduleDay[] = days.map((day) => ({
    id: day.id,
    date: day.date.toISOString(),
    slots: day.slots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      capacity: slot.capacity,
      booked: slot._count.bookings,
      note: slot.note
    }))
  }));

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <p className="small mt-2">
            <Link href="/admin/courses">{d.admin.coursesTitle}</Link>
          </p>

          <div className="section-title mt-4">
            <div>
              <h1>{course.title}</h1>
              <p className="muted mt-2">
                {d.schedule.sessionLength}: {course.sessionHours}{' '}
                {course.sessionHours === 1 ? d.schedule.hour : d.schedule.hours} ·{' '}
                {d.admin.timezoneNote} <span className="ltr-text">{APP_TIMEZONE}</span>
              </p>
            </div>
          </div>

          <div className="stack">
            <ScheduleCalendar
              courseId={course.id}
              initialDates={initialDates}
              lockedDates={lockedDates}
            />

            <div className="section-title mt-6">
              <h2>{d.schedule.setTimes}</h2>
            </div>

            <DayScheduleEditor
              days={scheduleDays}
              defaultHours={course.sessionHours}
            />
          </div>
        </div>
      </div>
    </>
  );
}
