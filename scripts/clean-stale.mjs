import { existsSync, rmSync, statSync } from 'node:fs';

/**
 * Removes files that were deleted in a past revision of this project.
 *
 * Unpacking an update over an existing checkout is additive: new files appear
 * and changed ones are overwritten, but files that were REMOVED upstream stay
 * behind. Next.js typechecks every .ts/.tsx under the project root, so an
 * orphaned component still fails the build even though nothing imports it.
 *
 * This runs as the first step of `npm run build`, so the fix ships with the
 * code instead of being a manual step. The list is explicit — this never
 * scans and guesses, so it cannot touch a file you added yourself.
 *
 * When a file is deleted upstream in future, its path gets appended here.
 */
const STALE_PATHS = [
  // Replaced by ScheduleCalendar + DayScheduleEditor when availability moved
  // from standalone slots to the course -> day -> time model.
  'components/AvailabilityManager.tsx',

  // Replaced by WeekScheduleGrid when the per-day forms became a timetable.
  'components/DayScheduleEditor.tsx'
];

let removed = 0;

for (const path of STALE_PATHS) {
  if (!existsSync(path)) continue;
  try {
    const info = statSync(path);
    rmSync(path, { recursive: true, force: true });
    console.log(`[clean-stale] removed ${path} (${info.size} bytes)`);
    removed++;
  } catch (error) {
    // A cleanup failure should not take the whole deploy down; if the file
    // genuinely breaks the build, the compiler will say so next.
    console.warn(`[clean-stale] could not remove ${path}:`, error.message);
  }
}

console.log(
  removed === 0
    ? '[clean-stale] nothing to remove.'
    : `[clean-stale] removed ${removed} stale file(s) left over from a previous version.`
);
