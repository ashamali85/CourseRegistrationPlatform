'use client';

import { useState, useTransition } from 'react';
import {
  addDaySlotAction,
  deleteDaySlotAction,
  copyDayTimesAction,
  type ActionState
} from '@/lib/actions/schedule-actions';
import { useI18n } from '@/components/I18nProvider';
import {
  WORK_DAY_HOURS,
  WORK_DAY_END_HOUR,
  hourValue,
  hourDisplay,
  SESSION_HOURS
} from '@/lib/time';
import { fill } from '@/lib/i18n';
import FormAlert from '@/components/FormAlert';

export type GridSlot = {
  id: string;
  /** Hour of day in APP_TIMEZONE, 20–23. Computed server-side. */
  startHour: number;
  /** 1, 2 or 3. */
  spanHours: number;
  capacity: number;
  booked: number;
};

/** A session on another course. Same instructor, so the hour is unavailable. */
export type BlockedSlot = {
  startHour: number;
  spanHours: number;
  courseTitle: string;
};

export type GridDay = {
  id: string;
  /** Pre-formatted on the server so the client does no timezone maths. */
  label: string;
  weekday: string;
  slots: GridSlot[];
  blocked: BlockedSlot[];
};

export default function WeekScheduleGrid({
  days,
  defaultHours
}: {
  days: GridDay[];
  defaultHours: number;
}) {
  const { d } = useI18n();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>({});
  const [sessionHours, setSessionHours] = useState(defaultHours);

  if (days.length === 0) {
    return (
      <div className="card empty">
        <h3>{d.schedule.noDaysTitle}</h3>
        <p>{d.schedule.noDaysBody}</p>
      </div>
    );
  }

  /** Which slot, if any, covers this hour on this day. */
  function slotCovering(day: GridDay, hour: number) {
    return day.slots.find(
      (slot) => hour >= slot.startHour && hour < slot.startHour + slot.spanHours
    );
  }

  function blockedCovering(day: GridDay, hour: number) {
    return day.blocked.find(
      (slot) => hour >= slot.startHour && hour < slot.startHour + slot.spanHours
    );
  }

  function addSlot(day: GridDay, hour: number) {
    if (hour + sessionHours > WORK_DAY_END_HOUR) {
      setFeedback({ error: fill(d.schedule.noRoom, { hours: sessionHours }) });
      return;
    }
    // A longer session must not run into an existing one — this course's or
    // another's — further down the day.
    for (let h = hour; h < hour + sessionHours; h++) {
      if (slotCovering(day, h)) {
        setFeedback({ error: d.schedule.occupied });
        return;
      }
      const clash = blockedCovering(day, h);
      if (clash) {
        setFeedback({
          error: fill(d.schedule.busyWith, { course: clash.courseTitle })
        });
        return;
      }
    }

    const data = new FormData();
    data.set('courseDayId', day.id);
    data.set('startTime', hourValue(hour));
    data.set('sessionHours', String(sessionHours));
    // One seat per session. The column still exists for future group
    // sessions, but nothing in the UI varies it.
    data.set('capacity', '1');

    startTransition(async () => {
      setFeedback(await addDaySlotAction({}, data));
    });
  }

  function removeSlot(slot: GridSlot) {
    if (slot.booked > 0 && !confirm(d.schedule.removeSession)) return;
    const data = new FormData();
    data.set('id', slot.id);
    startTransition(async () => {
      setFeedback(await deleteDaySlotAction({}, data));
    });
  }

  function copyTimes(day: GridDay) {
    const data = new FormData();
    data.set('id', day.id);
    startTransition(async () => {
      setFeedback(await copyDayTimesAction({}, data));
    });
  }

  return (
    <div className="card">
      <div className="section-title">
        <div>
          <h3>{d.schedule.setTimes}</h3>
          <p className="muted small mt-2">{d.schedule.workingHours}</p>
        </div>
      </div>

      <div className="grid-controls">
        <label className="inline-field">
          <span>{d.schedule.duration}</span>
          <select
            value={sessionHours}
            onChange={(e) => setSessionHours(Number(e.target.value))}
          >
            {SESSION_HOURS.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? d.schedule.hour : d.schedule.hours}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="small muted mt-2">{d.schedule.gridHint}</p>

      {(feedback.error || feedback.message) && (
        <div className="mt-4">
          <FormAlert error={feedback.error} message={feedback.message} />
        </div>
      )}

      {/* Forced LTR: a timetable reads left-to-right regardless of interface
          language, and mirroring it puts the earliest day on the right. */}
      <div className={`tt-scroll mt-4${pending ? ' is-pending' : ''}`} dir="ltr">
        <div
          className="tt-grid"
          style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(104px, 1fr))` }}
        >
          <div className="tt-corner" style={{ gridColumn: 1, gridRow: 1 }} />
          {days.map((day, dayIndex) => (
            <div
              key={day.id}
              className="tt-day-head"
              style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            >
              <span className="tt-weekday">{day.weekday}</span>
              <span className="tt-date">{day.label}</span>
              {day.slots.length > 0 && (
                <button
                  type="button"
                  className="tt-copy"
                  onClick={() => copyTimes(day)}
                  disabled={pending}
                  title={d.schedule.copyToAll}
                >
                  {d.schedule.copyToAll}
                </button>
              )}
            </div>
          ))}

          {WORK_DAY_HOURS.map((hour, rowIndex) => (
            <div key={hour} className="tt-row" style={{ gridRow: rowIndex + 2 }}>
              {hourDisplay(hour)}
            </div>
          ))}

          {days.map((day, colIndex) =>
            WORK_DAY_HOURS.map((hour, rowIndex) => {
              const covering = slotCovering(day, hour);
              const blocked = !covering ? blockedCovering(day, hour) : undefined;
              const span = covering ?? blocked;

              // Only the block's first hour renders; later hours are spanned.
              if (span && span.startHour !== hour) return null;

              const style = {
                gridColumn: colIndex + 2,
                gridRow: span
                  ? `${rowIndex + 2} / span ${span.spanHours}`
                  : rowIndex + 2
              };

              if (blocked) {
                return (
                  <div
                    key={`${day.id}-${hour}`}
                    className="tt-blocked"
                    style={style}
                    title={fill(d.schedule.busyWith, { course: blocked.courseTitle })}
                  >
                    <span className="tt-blocked-time">
                      {hourDisplay(blocked.startHour)}–
                      {hourDisplay(blocked.startHour + blocked.spanHours)}
                    </span>
                    <span className="tt-blocked-course">{blocked.courseTitle}</span>
                  </div>
                );
              }

              if (covering) {
                const full = covering.booked >= covering.capacity;
                return (
                  <button
                    key={`${day.id}-${hour}`}
                    type="button"
                    className={`tt-slot${full ? ' is-full' : ''}`}
                    style={style}
                    onClick={() => removeSlot(covering)}
                    disabled={pending}
                  >
                    <span className="tt-slot-time">
                      {hourDisplay(covering.startHour)}–
                      {hourDisplay(covering.startHour + covering.spanHours)}
                    </span>
                    {covering.booked > 0 && (
                      <span className="tt-slot-meta">{d.schedule.booked}</span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={`${day.id}-${hour}`}
                  type="button"
                  className="tt-empty"
                  style={style}
                  onClick={() => addSlot(day, hour)}
                  disabled={pending}
                  aria-label={`${day.label} ${hourDisplay(hour)}`}
                >
                  <span className="tt-plus">+</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
