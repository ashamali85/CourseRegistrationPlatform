import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Locked out? This issues a fresh temporary password for ADMIN_EMAIL, prints
 * it once, and forces a change at next login. It also bumps passwordChangedAt,
 * which invalidates every existing session for that account.
 *
 *   npm run admin:reset
 */
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!email) throw new Error('[reset] ADMIN_EMAIL is not set.');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`[reset] no user with email ${email}.`);

  const password = randomBytes(12).toString('base64url');

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

  const line = '='.repeat(64);
  console.log(`\n${line}`);
  console.log('  ADMIN PASSWORD RESET — shown once');
  console.log(line);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(line);
  console.log('  All existing sessions for this account are now invalid.');
  console.log(`${line}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
