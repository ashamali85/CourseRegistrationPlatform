'use client';

import { useActionState, useMemo, useState } from 'react';
import { setCourseDaysAction, type ActionState } from '@/lib/actions/schedule-actions';
import { orderedWeekdays } from '@/lib/i18n';
import { useI18n } from '@/components/I18nProvider';
import { dateKeyRange, todayKey } from '@/lib/time';
import { formatDateKeyShort } from '@/lib/format';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

type Mode = 'range' | 'single';

export default function ScheduleCalendar({
  courseId,
  initialDates,
  lockedDates
}: {
  courseId: string;
  /** Date keys already saved for this course. */
  initialDates: string[];
  /** Date keys that have confirmed bookings — cannot be unselected. */
  lockedDates: string[];
}) {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(
    setCourseDaysAction,
    {}
  );

  const locked = useMemo(() => new Set(lockedDates), [lockedDates]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialDates));
  const [mode, setMode] = useState<Mode>('range');
  // First half of a range click. Null means the next click starts a range.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const today = todayKey();
  // The calendar is rendered LTR and Sunday-first in every locale — a
  // timetable is not a paragraph, and mirroring it moves the first weekday to
  // the right, which reads as a bug rather than as localisation.
  const weekStart = 0;
  const weekdays = useMemo(() => orderedWeekdays(d, weekStart), [d]);

  const start = new Date(`${today}T00:00:00Z`);
  const [viewYear, setViewYear] = useState(start.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(start.getUTCMonth());

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(viewYear, viewMonth, 1));
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const leading = (first.getUTCDay() - weekStart + 7) % 7;

    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < leading; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({ key, day });
    }
    return out;
  }, [viewYear, viewMonth, weekStart]);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  /** The range being previewed between the anchor and the hovered day. */
  const preview = useMemo(() => {
    if (mode !== 'range' || !anchor || !hovered) return new Set<string>();
    return new Set(dateKeyRange(anchor, hovered));
  }, [mode, anchor, hovered]);

  function handleClick(key: string) {
    if (key < today) return;

    if (mode === 'single') {
      // Individual toggle — the escape hatch from consecutive-only selection.
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          if (locked.has(key)) return prev;
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      return;
    }

    if (!anchor) {
      setAnchor(key);
      return;
    }
    // Second click closes the range and adds every day between the two ends.
    setSelected((prev) => {
      const next = new Set(prev);
      for (const day of dateKeyRange(anchor, key)) next.add(day);
      return next;
    });
    setAnchor(null);
    setHovered(null);
  }

  function clearAll() {
    // Locked days survive a clear — their bookings would otherwise vanish.
    setSelected(new Set([...selected].filter((key) => locked.has(key))));
    setAnchor(null);
  }

  const sorted = useMemo(() => [...selected].sort(), [selected]);

  return (
    <div className="card">
      <div className="section-title">
        <h3>{d.schedule.pickDays}</h3>
        <div className="row">
          <button
            type="button"
            className={`btn btn-sm ${mode === 'range' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setMode('range');
              setAnchor(null);
            }}
          >
            {d.schedule.modeRange}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setMode('single');
              setAnchor(null);
            }}
          >
            {d.schedule.modeSingle}
          </button>
        </div>
      </div>

      <p className="small muted">
        {mode === 'range'
          ? anchor
            ? d.schedule.rangeHintSecond
            : d.schedule.rangeHintFirst
          : d.schedule.singleHint}
      </p>

      <div className="calendar mt-4" dir="ltr">
        <div className="calendar-head">
          <button
            type="button"
            className="calendar-nav"
            onClick={() => shiftMonth(-1)}
            aria-label={d.calendar.prevMonth}
          >
            ←
          </button>
          <span className="calendar-month">
            {d.calendar.months[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            className="calendar-nav"
            onClick={() => shiftMonth(1)}
            aria-label={d.calendar.nextMonth}
          >
            →
          </button>
        </div>

        <div className="calendar-grid" onMouseLeave={() => setHovered(null)}>
          {weekdays.map((label) => (
            <div key={label} className="calendar-dow">
              {label}
            </div>
          ))}

          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} className="calendar-day is-empty" />;

            const past = cell.key < today;
            const isSelected = selected.has(cell.key);
            const isLocked = locked.has(cell.key);
            const isAnchor = anchor === cell.key;
            const inPreview = preview.has(cell.key);

            const classes = [
              'calendar-day',
              'is-pickable',
              past ? 'is-past' : '',
              isSelected ? 'is-selected' : '',
              isLocked ? 'is-locked' : '',
              isAnchor ? 'is-anchor' : '',
              inPreview && !isSelected ? 'in-preview' : '',
              cell.key === today ? 'is-today' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cell.key}
                type="button"
                className={classes}
                disabled={past}
                aria-pressed={isSelected}
                title={isLocked ? d.schedule.lockedDay : undefined}
                onMouseEnter={() => setHovered(cell.key)}
                onFocus={() => setHovered(cell.key)}
                onClick={() => handleClick(cell.key)}
              >
                {cell.day}
                {isLocked && <span className="calendar-lock">•</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="row-between wrap mt-4">
        <span className="muted small">
          {sorted.length} {d.schedule.daysSelected}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
          {d.schedule.clear}
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="chip-list mt-2">
          {sorted.slice(0, 30).map((key) => (
            <span key={key} className={`chip${locked.has(key) ? ' chip-locked' : ''}`}>
              {formatDateKeyShort(`${key}T00:00:00Z`)}
            </span>
          ))}
          {sorted.length > 30 && <span className="chip">+{sorted.length - 30}</span>}
        </div>
      )}

      <form action={formAction} className="mt-4">
        <FormAlert error={state.error} message={state.message} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="dates" value={sorted.join(',')} />
        <SubmitButton className="btn btn-primary mt-4" pendingLabel={d.common.saving}>
          {d.schedule.saveDays}
        </SubmitButton>
      </form>
    </div>
  );
}
