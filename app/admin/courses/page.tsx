import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { isBlobConfigured } from '@/lib/images';
import TopBar from '@/components/TopBar';
import CourseManager, { type AdminCourse } from '@/components/CourseManager';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const admin = await requireAdmin();
  const { d } = await getT();

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } }, days: true } },
      days: { orderBy: { date: 'asc' }, select: { date: true } },
      images: { orderBy: { sortOrder: 'asc' } }
    }
  });

  const data: AdminCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    description: c.description,
    sessionHours: c.sessionHours,
    isPublished: c.isPublished,
    bookingCount: c._count.bookings,
    dayCount: c._count.days,
    firstDay: c.days[0]?.date.toISOString() ?? null,
    lastDay: c.days[c.days.length - 1]?.date.toISOString() ?? null,
    images: c.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))
  }));

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.admin.coursesTitle}</h1>
              <p className="muted mt-2">{d.admin.coursesSubtitle}</p>
            </div>
          </div>
          <CourseManager courses={data} blobConfigured={isBlobConfigured()} />
        </div>
      </div>
    </>
  );
}
