import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Idempotent seed. The admin account is the ONLY way an ADMIN user is ever
 * created — self-registration always forces STUDENT.
 *
 * If ADMIN_PASSWORD is set, that password is used for the first login. If it
 * is not, a random one is generated and printed to the build log.
 *
 * Either way the account is flagged mustChangePassword, so the first login
 * must set a real password before the app allows anything else. That makes the
 * seeded credential one-time: once changed, the value sitting in your Vercel
 * environment variables is no longer a working login.
 */
function generateTempPassword(): string {
  // 16 chars of base64url from 12 CSPRNG bytes.
  return randomBytes(12).toString('base64url');
}

function banner(email: string, password: string) {
  const line = '='.repeat(64);
  console.log(`\n${line}`);
  console.log('  TEMPORARY ADMIN PASSWORD — generated, shown once');
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
  const providedPassword = process.env.ADMIN_PASSWORD?.trim();
  // Escape hatch for a lockout, with no CLI: set this to "true", redeploy,
  // then remove it again.
  const forceReset = process.env.ADMIN_PASSWORD_RESET?.trim().toLowerCase() === 'true';

  if (!email) {
    console.warn('[seed] ADMIN_EMAIL not set — skipping admin creation.');
  } else {
    if (providedPassword && providedPassword.length < 10) {
      throw new Error('[seed] ADMIN_PASSWORD must be at least 10 characters.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    const usingTemp = !providedPassword;
    const password = providedPassword ?? generateTempPassword();

    if (existing && !forceReset) {
      // Normal redeploy: never touch a password that is already in use, or
      // every deploy would silently reset your credentials.
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
        console.log(`[seed] promoted ${email} to ADMIN`);
      } else {
        console.log(`[seed] admin ${email} already exists — left untouched`);
      }
    } else if (existing && forceReset) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          role: 'ADMIN',
          isActive: true,
          mustChangePassword: true,
          passwordChangedAt: new Date(Math.floor(Date.now() / 1000) * 1000)
        }
      });
      console.log(`[seed] ADMIN_PASSWORD_RESET was set — password reset for ${email}`);
      console.log('[seed] all existing sessions for this account are now invalid');
      console.log('[seed] REMOVE ADMIN_PASSWORD_RESET from your environment now');
      if (usingTemp) banner(email, password);
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: 'ADMIN',
          isActive: true,
          // Always true. Whether the password came from an environment
          // variable or was generated here, it has passed through storage you
          // do not fully control — so it is a one-time credential, not a
          // permanent one.
          mustChangePassword: true
        }
      });

      if (usingTemp) {
        banner(email, password);
      } else {
        console.log(`[seed] created admin ${email} using ADMIN_PASSWORD`);
        console.log('[seed] you will be asked to set a new password at first login');
      }
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
