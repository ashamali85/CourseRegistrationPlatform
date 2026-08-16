import { spawnSync } from 'node:child_process';

/**
 * `prisma db push` refuses destructive changes, and in CI there is no prompt to
 * confirm them, so a breaking schema change fails the build. Two escape
 * hatches, both off by default and both meant to be removed after one deploy.
 *
 *   ALLOW_DATA_LOSS=true  -> --accept-data-loss
 *     Permits DROPPING columns/tables that hold data.
 *
 *   ALLOW_DB_RESET=true   -> --force-reset
 *     DROPS THE ENTIRE SCHEMA and rebuilds it. Every user, course, day, slot
 *     and booking is destroyed. Needed when a NEW REQUIRED column is added to
 *     a table that already has rows: --accept-data-loss cannot help there,
 *     because Prisma has no value to backfill the existing rows with.
 *
 * After a reset the seed re-creates your admin account. If ADMIN_PASSWORD is
 * not set, it generates a temporary one and prints it in this build log.
 */
const truthy = (v) => v?.trim().toLowerCase() === 'true';

const reset = truthy(process.env.ALLOW_DB_RESET);
const dataLoss = truthy(process.env.ALLOW_DATA_LOSS);

const args = ['prisma', 'db', 'push'];

if (reset) {
  args.push('--force-reset');
  console.warn('');
  console.warn('='.repeat(64));
  console.warn('  ALLOW_DB_RESET is set — DROPPING AND REBUILDING THE SCHEMA.');
  console.warn('  All users, courses, schedules and bookings are being erased.');
  console.warn('  REMOVE this variable from your environment after this deploy.');
  console.warn('='.repeat(64));
  console.warn('');
} else if (dataLoss) {
  args.push('--accept-data-loss');
  console.warn('[db-push] ALLOW_DATA_LOSS is set — destructive changes permitted.');
  console.warn('[db-push] Remove this variable after the deploy succeeds.');
}

const run = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (run.status !== 0) {
  console.error('');
  console.error('[db-push] failed.');
  console.error('[db-push] "cannot be executed" / "required column ... without a default"');
  console.error('[db-push] means existing rows block the change. Pre-launch, set');
  console.error('[db-push] ALLOW_DB_RESET=true for ONE deploy, then remove it.');
}

process.exit(run.status ?? 1);
