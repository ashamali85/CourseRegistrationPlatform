import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import TopBar from '@/components/TopBar';
import CourseManager, { type AdminCourse } from '@/components/CourseManager';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const admin = await requireAdmin();

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }
    }
  });

  const data: AdminCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    description: c.description,
    durationMinutes: c.durationMinutes,
    isPublished: c.isPublished,
    bookingCount: c._count.bookings
  }));

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>Courses</h1>
              <p className="muted mt-2">Only published courses appear to students.</p>
            </div>
          </div>
          <CourseManager courses={data} />
        </div>
      </div>
    </>
  );
}
