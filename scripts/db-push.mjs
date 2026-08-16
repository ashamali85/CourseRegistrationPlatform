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
/**
 * Tolerant on purpose. Pasting `"true"` into the Vercel dashboard keeps the
 * quotes as part of the value, and a strict === 'true' silently reads that as
 * off — which looks exactly like the variable never being set at all.
 */
const truthy = (v) => {
  if (typeof v !== 'string') return false;
  const cleaned = v.trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
  return cleaned === 'true' || cleaned === '1' || cleaned === 'yes' || cleaned === 'on';
};

const show = (name) => {
  const raw = process.env[name];
  if (raw === undefined) return `${name}=<not set>`;
  return `${name}=${JSON.stringify(raw)}${truthy(raw) ? ' -> ON' : ' -> off'}`;
};

// Neither of these is a secret, so printing them makes a misconfiguration
// obvious in the build log instead of looking like the flag was ignored.
console.log('[db-push]', show('ALLOW_DB_RESET'));
console.log('[db-push]', show('ALLOW_DATA_LOSS'));

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
  console.error('[db-push]');
  console.error('[db-push] If the two lines at the top of this step show');
  console.error('[db-push] "<not set>" or "-> off", the variable never reached');
  console.error('[db-push] the build. In Vercel: Settings -> Environment');
  console.error('[db-push] Variables, value is exactly  true  with NO quotes,');
  console.error('[db-push] ticked for the environment you are deploying, then');
  console.error('[db-push] trigger a NEW deployment.');
}

process.exit(run.status ?? 1);
