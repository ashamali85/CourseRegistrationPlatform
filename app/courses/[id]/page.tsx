import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { startOfTodayUtc } from '@/lib/time';
import TopBar from '@/components/TopBar';
import SlotCalendar, { type CalendarSlot } from '@/components/SlotCalendar';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });

  // An unpublished course is a 404 for students even if they know the id.
  if (!course || (!course.isPublished && user.role !== 'ADMIN')) notFound();

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      startsAt: { gte: startOfTodayUtc() },
      OR: [{ courseId: null }, { courseId: course.id }]
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
            <Link href="/courses">← All courses</Link>
          </p>

          <div className="card mt-4">
            <div className="row-between wrap">
              <div className="grow">
                <h1>{course.title}</h1>
                {course.summary && <p className="muted mt-2">{course.summary}</p>}
              </div>
              <span className="pill pill-brand">{course.durationMinutes} min</span>
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
              <h2>Choose a time</h2>
              <p className="muted small mt-2">
                Highlighted days have open slots. Select one to see the times.
              </p>
            </div>
          </div>

          <SlotCalendar courseId={course.id} slots={calendarSlots} />
        </div>
      </div>
    </>
  );
}
