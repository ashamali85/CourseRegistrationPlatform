import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { formatDate } from '@/lib/format';
import TopBar from '@/components/TopBar';
import StudentManager, { type StudentRow } from '@/components/StudentManager';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage() {
  const admin = await requireAdmin();
  const { locale, d } = await getT();

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } }
  });

  const rows: StudentRow[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    isActive: student.isActive,
    emailVerified: student.emailVerified !== null,
    bookingCount: student._count.bookings,
    joined: formatDate(student.createdAt, locale)
  }));

  return (
    <>
      <TopBar user={admin} />
      <div className="page">
        <div className="container">
          <div className="section-title">
            <div>
              <h1>{d.students.title}</h1>
              <p className="muted mt-2">{d.students.subtitle}</p>
            </div>
          </div>
          <StudentManager students={rows} />
        </div>
      </div>
    </>
  );
}
