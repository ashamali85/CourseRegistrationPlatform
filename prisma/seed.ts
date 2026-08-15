import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Idempotent seed. The admin account is the ONLY way an ADMIN user is ever
 * created — self-registration always forces STUDENT.
 *
 * If ADMIN_PASSWORD is set, that password is used. If it is not, a random
 * temporary one is generated HERE, on your machine, printed once, and the
 * account is flagged mustChangePassword so the app forces a change at first
 * login. A generated password is never written to a file or committed.
 */
function generateTempPassword(): string {
  // 16 chars of base64url from 12 CSPRNG bytes.
  return randomBytes(12).toString('base64url');
}

function banner(email: string, password: string) {
  const line = '='.repeat(64);
  console.log(`\n${line}`);
  console.log('  TEMPORARY ADMIN PASSWORD — shown once, not stored anywhere');
  console.log(line);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(line);
  console.log('  You must change this at first login before the app will');
  console.log('  let you do anything else.');
  console.log(`${line}\n`);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
  const providedPassword = process.env.ADMIN_PASSWORD;

  if (!email) {
    console.warn('[seed] ADMIN_EMAIL not set — skipping admin creation.');
  } else {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Never silently reset a password that is already in use. Use
      // `npm run admin:reset` if you are locked out.
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
        console.log(`[seed] promoted ${email} to ADMIN`);
      } else {
        console.log(`[seed] admin ${email} already exists — left untouched`);
      }
    } else {
      const usingTemp = !providedPassword;
      const password = providedPassword ?? generateTempPassword();

      if (providedPassword && providedPassword.length < 10) {
        throw new Error('[seed] ADMIN_PASSWORD must be at least 10 characters.');
      }

      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: 'ADMIN',
          isActive: true,
          // A password you chose yourself does not need forcing; a generated
          // one always does.
          mustChangePassword: usingTemp
        }
      });

      if (usingTemp) banner(email, password);
      else console.log(`[seed] created admin ${email} with the supplied password`);
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
