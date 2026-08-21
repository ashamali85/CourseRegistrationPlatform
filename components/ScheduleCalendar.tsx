'use client';

import { useActionState, useMemo, useState } from 'react';
import { setCourseDaysAction, type ActionState } from '@/lib/actions/schedule-actions';
import { orderedWeekdays, fill } from '@/lib/i18n';
import { useI18n } from '@/components/I18nProvider';
import { todayKey, expandWeekly, endOfYearKey } from '@/lib/time';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

const MAX_DAYS = 366;

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

  /** The days actually clicked. Repeat occurrences are derived, not stored. */
  const [chosen, setChosen] = useState<Set<string>>(new Set(initialDates));
  const [repeat, setRepeat] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');

  const today = todayKey();
  // The calendar renders LTR and Sunday-first in every locale — a timetable is
  // not a paragraph, and mirroring it moves the first weekday to the right.
  const weekStart = 0;
  const weekdays = useMemo(() => orderedWeekdays(d, weekStart), [d]);

  const start = new Date(`${today}T00:00:00Z`);
  const [viewYear, setViewYear] = useState(start.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(start.getUTCMonth());

  const chosenList = useMemo(() => [...chosen].sort(), [chosen]);

  /** Chosen days plus every weekly occurrence they generate. */
  const finalDates = useMemo(() => {
    if (!repeat || chosenList.length === 0) return chosenList;
    return expandWeekly(chosenList, repeatUntil || undefined, MAX_DAYS + 1);
  }, [chosenList, repeat, repeatUntil]);

  const generated = useMemo(() => {
    const set = new Set(finalDates);
    for (const key of chosenList) set.delete(key);
    return set;
  }, [finalDates, chosenList]);

  const defaultEndYear = chosenList.length
    ? endOfYearKey(chosenList[chosenList.length - 1]).slice(0, 4)
    : String(start.getUTCFullYear());

  const overLimit = finalDates.length > MAX_DAYS;

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
    setChosen((prev) => {
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
    setChosen(new Set([...chosen].filter((key) => locked.has(key))));
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
            const isChosen = chosen.has(cell.key);
            const isGenerated = !isChosen && generated.has(cell.key);
            const isLocked = locked.has(cell.key);

            const classes = [
              'calendar-day',
              'is-pickable',
              past ? 'is-past' : '',
              isChosen ? 'is-selected' : '',
              isGenerated ? 'is-generated' : '',
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
                // Generated days are read-only: you edit the week you chose,
                // not its copies. After saving they become ordinary days.
                disabled={past || isGenerated}
                aria-pressed={isChosen}
                title={
                  isLocked
                    ? d.schedule.lockedDay
                    : isGenerated
                      ? d.schedule.generatedDay
                      : undefined
                }
                onClick={() => toggleDay(cell.key)}
              >
                {cell.day}
                {isLocked && <span className="calendar-lock">•</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="repeat-box mt-4">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(e) => setRepeat(e.target.checked)}
          />
          <span>{d.schedule.repeatWeekly}</span>
        </label>

        {repeat && (
          <div className="mt-2">
            <label htmlFor="repeatUntil">{d.schedule.repeatUntil}</label>
            <input
              id="repeatUntil"
              type="date"
              min={chosenList[chosenList.length - 1] ?? today}
              value={repeatUntil}
              onChange={(e) => setRepeatUntil(e.target.value)}
            />
            <p className="small muted mt-2">
              {fill(d.schedule.repeatUntilHint, { year: defaultEndYear })}
            </p>
          </div>
        )}
      </div>

      <form action={formAction} className="mt-4">
        <FormAlert error={state.error} message={state.message} />

        {overLimit && (
          <div className="alert alert-error mt-2">
            {fill(d.schedule.tooManyGenerated, {
              total: finalDates.length,
              max: MAX_DAYS
            })}
          </div>
        )}

        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="dates" value={finalDates.join(',')} />

        <div className="row-between wrap mt-4">
          <span className="muted small">
            {chosenList.length} {d.schedule.daysSelected}
            {generated.size > 0 && (
              <>
                {' · '}
                {fill(d.schedule.plusRepeats, { n: generated.size })}
              </>
            )}
          </span>
          <div className="row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
              {d.schedule.clear}
            </button>
            <SubmitButton
              className="btn btn-primary btn-sm"
              pendingLabel={d.common.saving}
              disabled={overLimit}
            >
              {d.schedule.saveDays}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
