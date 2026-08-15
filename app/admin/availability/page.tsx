import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { startOfTodayUtc } from '@/lib/time';
import { APP_TIMEZONE } from '@/lib/env';
import { getT } from '@/lib/locale';
import TopBar from '@/components/TopBar';
import AvailabilityManager, {
  type AdminSlot,
  type CourseOption
} from '@/components/AvailabilityManager';

export const dynamic = 'force-dynamic';

export default async function AdminAvailabilityPage() {
  const admin = await requireAdmin();
  const { d } = await getT();

  const [slots, courses] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { startsAt: { gte: startOfTodayUtc() } },
      orderBy: { startsAt: 'asc' },
      include: {
        course: { select: { title: true } },
        _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }
      }
    }),
    prisma.course.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } })
  ]);

  const slotData: AdminSlot[] = slots.map((s) => ({
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    capacity: s.capacity,
    booked: s._count.bookings,
    note: s.note,
    courseTitle: s.course?.title ?? null
  }));

  const courseOptions: CourseOption[] = courses;

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
          <AvailabilityManager slots={slotData} courses={courseOptions} />
        </div>
      </div>
    </>
  );
}
