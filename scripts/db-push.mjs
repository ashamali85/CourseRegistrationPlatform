import { spawnSync } from 'node:child_process';

/**
 * `prisma db push` refuses to drop a column that holds data unless it is told
 * to. In CI there is no prompt, so a breaking schema change fails the build.
 *
 * Set ALLOW_DATA_LOSS=true in Vercel for ONE deploy to get past a restructure,
 * then remove it. Leaving it on means a future schema edit could silently drop
 * a column of real bookings.
 */
const allow = process.env.ALLOW_DATA_LOSS?.trim().toLowerCase() === 'true';
const args = ['prisma', 'db', 'push'];
if (allow) {
  args.push('--accept-data-loss');
  console.warn('[db-push] ALLOW_DATA_LOSS is set — destructive changes permitted.');
  console.warn('[db-push] Remove this variable after the deploy succeeds.');
}

const run = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(run.status ?? 1);
