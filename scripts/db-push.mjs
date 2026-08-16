import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Push the schema, healing the legacy availability model on the way.
 *
 * Step 1 runs prisma/migrate-legacy.sql, which is guarded entirely by checks on
 * the database's current shape: a no-op on a fresh or already-migrated
 * database, and on a legacy one it removes exactly what blocks the new schema.
 *
 * Step 2 then runs `prisma db push` with no destructive flags, because after
 * step 1 there is nothing destructive left for it to do.
 *
 * The two override variables remain for emergencies only:
 *   ALLOW_DATA_LOSS=true -> --accept-data-loss
 *   ALLOW_DB_RESET=true  -> --force-reset (DROPS EVERYTHING)
 */
const truthy = (v) => {
  if (typeof v !== 'string') return false;
  const cleaned = v.trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
  return cleaned === 'true' || cleaned === '1' || cleaned === 'yes' || cleaned === 'on';
};

const npx = (args, label) => {
  const run = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (run.status !== 0) console.error(`[db-push] ${label} exited with ${run.status}`);
  return run.status === 0;
};

// DDL wants the non-pooled endpoint; Neon's pooled host is PgBouncer.
const migrationUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

const LEGACY_SQL = 'prisma/migrate-legacy.sql';

if (!migrationUrl) {
  console.error('[db-push] Neither DIRECT_URL nor DATABASE_URL is set.');
  process.exit(1);
}

if (existsSync(LEGACY_SQL)) {
  console.log('[db-push] Checking for the legacy availability schema…');
  const ok = npx(
    ['prisma', 'db', 'execute', '--url', migrationUrl, '--file', LEGACY_SQL],
    'legacy migration'
  );
  if (!ok) {
    console.error('[db-push] The legacy check failed. This is usually a connection');
    console.error('[db-push] problem rather than a schema one — verify DIRECT_URL.');
    process.exit(1);
  }
  console.log('[db-push] Legacy check complete.');
} else {
  console.warn(`[db-push] ${LEGACY_SQL} not found — skipping the legacy check.`);
}

const reset = truthy(process.env.ALLOW_DB_RESET);
const dataLoss = truthy(process.env.ALLOW_DATA_LOSS);

const args = ['prisma', 'db', 'push'];

if (reset) {
  args.push('--force-reset');
  console.warn('');
  console.warn('='.repeat(64));
  console.warn('  ALLOW_DB_RESET is set — DROPPING AND REBUILDING THE SCHEMA.');
  console.warn('  All users, courses, schedules and bookings are being erased.');
  console.warn('  You should not need this. Remove it and redeploy.');
  console.warn('='.repeat(64));
  console.warn('');
} else if (dataLoss) {
  args.push('--accept-data-loss');
  console.warn('[db-push] ALLOW_DATA_LOSS is set — destructive changes permitted.');
}

if (!npx(args, 'db push')) {
  console.error('');
  console.error('[db-push] Schema push failed.');
  console.error('[db-push] If it mentions a required column blocked by existing');
  console.error('[db-push] rows, the legacy migration did not match your database.');
  console.error('[db-push] Send the full log rather than setting ALLOW_DB_RESET —');
  console.error('[db-push] that flag destroys every account and booking you have.');
  process.exit(1);
}

process.exit(0);
