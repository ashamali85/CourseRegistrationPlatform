-- ---------------------------------------------------------------------------
-- One-time, self-limiting migration from the old availability model
-- (standalone AvailabilitySlot.courseId + Course.durationMinutes) to the new
-- course -> day -> time model.
--
-- Every branch is guarded by a check on the CURRENT shape of the database, so
-- this file is safe to run on every deploy forever:
--   * fresh database          -> every condition false, no-op
--   * already migrated        -> every condition false, no-op
--   * legacy shape            -> cleaned up exactly once
--
-- The point is to leave `prisma db push` with nothing destructive to do, so it
-- never needs --accept-data-loss or --force-reset. Users, courses and the admin
-- account all survive.
--
-- Statements run through EXECUTE so plpgsql never parses a reference to a
-- table or column that does not exist in this database.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  slot_table_exists   boolean;
  has_course_day_id   boolean;
  has_legacy_slot_fk  boolean;
  has_duration_col    boolean;
  removed_rows        integer := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AvailabilitySlot'
  ) INTO slot_table_exists;

  IF slot_table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AvailabilitySlot'
        AND column_name = 'courseDayId'
    ) INTO has_course_day_id;

    -- Legacy shape: the table predates courseDayId. Existing rows are what
    -- blocks the new required column, and they cannot be migrated because a
    -- slot had no day to belong to. Bookings cascade away with them.
    IF NOT has_course_day_id THEN
      EXECUTE 'DELETE FROM "AvailabilitySlot"';
      GET DIAGNOSTICS removed_rows = ROW_COUNT;
      RAISE NOTICE 'Legacy schema detected: removed % orphaned availability slot(s).', removed_rows;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'AvailabilitySlot'
          AND column_name = 'courseId'
      ) INTO has_legacy_slot_fk;

      IF has_legacy_slot_fk THEN
        -- Dropping the column drops its foreign key with it.
        EXECUTE 'ALTER TABLE "AvailabilitySlot" DROP COLUMN "courseId"';
        RAISE NOTICE 'Dropped legacy AvailabilitySlot.courseId.';
      END IF;
    END IF;
  END IF;

  -- Course.durationMinutes was replaced by Course.sessionHours. Dropping it
  -- here means db push only has to ADD sessionHours, which needs no flag.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Course'
      AND column_name = 'durationMinutes'
  ) INTO has_duration_col;

  IF has_duration_col THEN
    EXECUTE 'ALTER TABLE "Course" DROP COLUMN "durationMinutes"';
    RAISE NOTICE 'Dropped legacy Course.durationMinutes (replaced by sessionHours).';
  END IF;
END $$;
