import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { startOfTodayUtc } from '@/lib/time';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';
import SlotCalendar, { type CalendarSlot } from '@/components/SlotCalendar';
import CourseGallery from '@/components/CourseGallery';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { d } = await getT();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    // The cover leads the slider, then the gallery in upload order.
    include: { images: { orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }] } }
  });

  // An unpublished course is a 404 for students even if they know the id.
  if (!course || (!course.isPublished && user.role !== 'ADMIN')) notFound();

  // Slots now hang off this course's own days, so no cross-course filter is
  // needed — the schedule the admin built IS the student's calendar.
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      startsAt: { gte: startOfTodayUtc() },
      courseDay: { courseId: course.id }
    },
    orderBy: { startsAt: 'asc' },
    include: {
      bookings: {
        where: { status: 'CONFIRMED' },
        select: { userId: true }
      }
    }
  });

  const calendarSlots: CalendarSlot[] = slots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    capacity: slot.capacity,
    seatsLeft: Math.max(0, slot.capacity - slot.bookings.length),
    bookedByMe: slot.bookings.some((b) => b.userId === user.id),
    note: slot.note
  }));

  return (
    <>
      <TopBar user={user} />
      <div className="page">
        <div className="container">
          <p className="small mt-2">
            <Link href="/courses">{d.courses.allCourses}</Link>
          </p>

          {course.images.length > 0 && (
            <div className="mt-4">
              <CourseGallery
                images={course.images.map((image) => ({
                  id: image.id,
                  url: image.url,
                  alt: image.alt || course.title
                }))}
              />
            </div>
          )}

          <div className="card mt-4">
            <div className="row-between wrap">
              <div className="grow">
                <h1>{course.title}</h1>
                {course.summary && <p className="muted mt-2">{course.summary}</p>}
              </div>
              <span className="pill pill-brand">
                {course.sessionHours}{' '}
                {course.sessionHours === 1 ? d.schedule.hour : d.schedule.hours}
              </span>
            </div>

            {course.description && (
              <>
                <hr className="divider" />
                <p style={{ whiteSpace: 'pre-wrap' }}>{course.description}</p>
              </>
            )}
          </div>

          <div className="section-title mt-6">
            <div>
              <h2>{d.courses.chooseTime}</h2>
              <p className="muted small mt-2">{d.courses.chooseTimeHint}</p>
            </div>
          </div>

          <SlotCalendar courseId={course.id} slots={calendarSlots} />
        </div>
      </div>
    </>
  );
}
