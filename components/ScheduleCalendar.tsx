'use client';

import { useActionState, useMemo, useState } from 'react';
import { setCourseDaysAction, type ActionState } from '@/lib/actions/schedule-actions';
import { orderedWeekdays } from '@/lib/i18n';
import { useI18n } from '@/components/I18nProvider';
import { todayKey } from '@/lib/time';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

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

  const today = todayKey();
  // The calendar renders LTR and Sunday-first in every locale — a timetable is
  // not a paragraph, and mirroring it moves the first weekday to the right.
  const weekStart = 0;
  const weekdays = useMemo(() => orderedWeekdays(d, weekStart), [d]);

  const start = new Date(`${today}T00:00:00Z`);
  const [viewYear, setViewYear] = useState(start.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(start.getUTCMonth());

  const sorted = useMemo(() => [...selected].sort(), [selected]);

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

  function toggleDay(key: string) {
    if (key < today) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // A day with confirmed bookings cannot be dropped — that would cancel
        // a student's session without telling anyone.
        if (locked.has(key)) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set([...selected].filter((key) => locked.has(key))));
  }

  return (
    <div className="card">
      <div className="section-title">
        <h3>{d.schedule.pickDays}</h3>
      </div>
      <p className="small muted">{d.schedule.singleHint}</p>

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

        <div className="calendar-grid">
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

            const classes = [
              'calendar-day',
              'is-pickable',
              past ? 'is-past' : '',
              isSelected ? 'is-selected' : '',
              isLocked ? 'is-locked' : '',
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
                onClick={() => toggleDay(cell.key)}
              >
                {cell.day}
                {isLocked && <span className="calendar-lock">•</span>}
              </button>
            );
          })}
        </div>
      </div>

      <form
        action={formAction}
        className="mt-4"
        onSubmit={(event) => {
          if (!confirm(d.schedule.confirmSaveDays)) event.preventDefault();
        }}
      >
        <FormAlert error={state.error} message={state.message} />

        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="dates" value={sorted.join(',')} />

        <div className="row-between wrap mt-4">
          <span className="muted small">
            {sorted.length} {d.schedule.daysSelected}
          </span>
          <div className="row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
              {d.schedule.clear}
            </button>
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel={d.common.saving}>
              {d.schedule.saveDays}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
