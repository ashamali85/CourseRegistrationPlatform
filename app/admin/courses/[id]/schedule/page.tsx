import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { utcToDateKey, todayKey, dateKeyToUtc, hourInAppTz } from '@/lib/time';
import { formatWeekday, formatDayMonth, dayKey } from '@/lib/format';
import { APP_TIMEZONE } from '@/lib/env';
import TopBar from '@/components/TopBar';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import WeekScheduleGrid, { type GridDay } from '@/components/WeekScheduleGrid';

export const dynamic = 'force-dynamic';

export default async function CourseSchedulePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { locale, d } = await getT();
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

  // Slots belonging to OTHER courses on the same dates. There is one
  // instructor, so these hours are unavailable here too — and if they are not
  // drawn, the cell looks free and clicking it only fails after a round trip.
  const otherSlots =
    days.length === 0
      ? []
      : await prisma.availabilitySlot.findMany({
          where: {
            startsAt: {
              gte: days[0].date,
              lt: new Date(days[days.length - 1].date.getTime() + 48 * 3600 * 1000)
            },
            courseDay: { courseId: { not: course.id } }
          },
          include: {
            courseDay: { include: { course: { select: { title: true } } } }
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

  // Hours and labels are resolved here, in APP_TIMEZONE, so the grid does no
  // timezone maths and cannot drift between server render and hydration.
  const gridDays: GridDay[] = days.map((day) => {
    return {
      id: day.id,
      weekday: formatWeekday(day.date, locale),
      label: formatDayMonth(day.date, locale),
      slots: day.slots.map((slot) => ({
        id: slot.id,
        startHour: hourInAppTz(slot.startsAt),
        spanHours: Math.max(
          1,
          Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 3600000)
        ),
        capacity: slot.capacity,
        booked: slot._count.bookings
      })),
      blocked: otherSlots
        .filter((slot) => dayKey(slot.startsAt) === utcToDateKey(day.date))
        .map((slot) => ({
          startHour: hourInAppTz(slot.startsAt),
          spanHours: Math.max(
            1,
            Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 3600000)
          ),
          courseTitle: slot.courseDay.course.title
        }))
    };
  });

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

            <WeekScheduleGrid
              courseId={course.id}
              days={gridDays}
              defaultHours={course.sessionHours}
            />
          </div>
        </div>
      </div>
    </>
  );
}
