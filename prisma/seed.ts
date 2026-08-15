import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Idempotent seed. The admin account is the ONLY way an ADMIN user is ever
 * created — self-registration always forces STUDENT.
 *
 * Credentials come from the environment; this script never invents a password.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.'
    );
  } else {
    if (password.length < 10) {
      throw new Error('[seed] ADMIN_PASSWORD must be at least 10 characters.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Never silently reset a password that is already in use.
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
        console.log(`[seed] promoted ${email} to ADMIN`);
      } else {
        console.log(`[seed] admin ${email} already exists`);
      }
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log(`[seed] created admin ${email}`);
    }
  }

  await prisma.counter.upsert({
    where: { name: 'booking' },
    create: { name: 'booking', value: 0 },
    update: {}
  });

  const courseCount = await prisma.course.count();
  if (courseCount === 0) {
    await prisma.course.createMany({
      data: [
        {
          title: 'Introduction to Web Development',
          summary: 'HTML, CSS and JavaScript fundamentals in one session.',
          description:
            'A one-to-one session covering how the web works, the structure of a page, styling basics, and your first piece of interactive JavaScript.\n\nBring a laptop with a code editor installed.',
          durationMinutes: 60,
          isPublished: true
        },
        {
          title: 'Databases for Beginners',
          summary: 'Tables, relationships and your first queries.',
          description:
            'Understand what a relational database is, how tables relate to each other, and how to write SELECT, INSERT and JOIN queries with confidence.',
          durationMinutes: 90,
          isPublished: true
        }
      ]
    });
    console.log('[seed] created 2 sample courses');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
