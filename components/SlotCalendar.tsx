'use client';

import { useActionState, useMemo, useState } from 'react';
import { bookSlotAction, type ActionState } from '@/lib/actions/booking-actions';
import { formatTime, dayKey } from '@/lib/format';
import { orderedWeekdays } from '@/lib/i18n';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type CalendarSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  seatsLeft: number;
  capacity: number;
  bookedByMe: boolean;
  note: string;
};

export default function SlotCalendar({
  courseId,
  slots
}: {
  courseId: string;
  slots: CalendarSlot[];
}) {
  const { locale, d } = useI18n();
  const [state, formAction, booking] = useActionState<ActionState, FormData>(
    bookSlotAction,
    {}
  );
  useBusyWhile(booking);

  // The calendar is rendered LTR and Sunday-first in every locale — a
  // timetable is not a paragraph, and mirroring it moves the first weekday to
  // the right, which reads as a bug rather than as localisation.
  const weekStart = 0;
  const weekdays = useMemo(() => orderedWeekdays(d, weekStart), [d]);

  // Bucket slots by calendar day so the grid can show which days have anything.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const slot of slots) {
      const key = dayKey(slot.startsAt);
      const list = map.get(key);
      if (list) list.push(slot);
      else map.set(key, [slot]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [slots]);

  const firstDayWithSlots = useMemo(() => {
    const keys = [...byDay.keys()].sort();
    return keys[0] ?? null;
  }, [byDay]);

  const initialMonth = firstDayWithSlots ? new Date(firstDayWithSlots + 'T12:00:00Z') : new Date();

  const [viewYear, setViewYear] = useState(initialMonth.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(firstDayWithSlots);

  const todayKey = dayKey(new Date());

  // Build the month grid. Arabic starts the week on Sunday, English on Monday,
  // so the leading blank count comes from the locale's weekStart rather than
  // being hard-coded.
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

  const selectedSlots = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  if (slots.length === 0) {
    return (
      <div className="empty">
        <h3>{d.calendar.noTimesTitle}</h3>
        <p>{d.calendar.noTimesBody}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="calendar" dir="ltr">
        <div className="calendar-head">
          {/* "Previous" sits on the right in RTL. The glyph is mirrored in CSS
              rather than swapping the handlers, so the DOM order stays correct
              for screen readers and keyboard tabbing. */}
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
            if (!cell) return <div key={`empty-${i}`} className="calendar-day is-empty" />;

            const daySlots = byDay.get(cell.key) ?? [];
            const hasSlots = daySlots.length > 0;
            const classes = [
              'calendar-day',
              hasSlots ? 'has-slots' : '',
              selectedDay === cell.key ? 'is-selected' : '',
              cell.key === todayKey ? 'is-today' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cell.key}
                type="button"
                className={classes}
                disabled={!hasSlots}
                aria-label={`${cell.day} ${d.calendar.months[viewMonth]} — ${
                  hasSlots
                    ? `${daySlots.length} ${d.calendar.timesAvailable}`
                    : d.calendar.noTimes
                }`}
                onClick={() => hasSlots && setSelectedDay(cell.key)}
              >
                {cell.day}
                {hasSlots && <span className="calendar-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {(state.error || state.message) && (
        <FormAlert error={state.error} message={state.message} />
      )}

      {selectedDay && (
        <div className="card">
          <div className="section-title">
            <h3>
              {d.calendar.timesOn} <span className="ltr-text">{selectedDay}</span>
            </h3>
            <span className="muted small">
              {selectedSlots.length} {d.calendar.available}
            </span>
          </div>

          {selectedSlots.length === 0 ? (
            <p className="muted">{d.calendar.nothingOpen}</p>
          ) : (
            <div className="slot-list">
              {selectedSlots.map((slot) => {
                const full = slot.seatsLeft <= 0;
                return (
                  <div
                    key={slot.id}
                    className={`slot-card${full && !slot.bookedByMe ? ' is-full' : ''}`}
                  >
                    <div className="slot-time ltr-text">
                      {formatTime(slot.startsAt, locale)} – {formatTime(slot.endsAt, locale)}
                    </div>

                    <div className="mt-2">
                      {slot.bookedByMe ? (
                        <span className="pill pill-ok">{d.calendar.bookedByYou}</span>
                      ) : full ? (
                        <span className="pill pill-muted">{d.calendar.fullyBooked}</span>
                      ) : (
                        <span className="pill pill-brand">
                          {slot.seatsLeft} {d.calendar.of} {slot.capacity} {d.calendar.seatsLeft}
                        </span>
                      )}
                    </div>

                    {slot.note && <p className="small muted mt-2">{slot.note}</p>}

                    {!slot.bookedByMe && !full && (
                      <form action={formAction} className="mt-2">
                        <input type="hidden" name="slotId" value={slot.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <SubmitButton
                          className="btn btn-primary btn-sm btn-block"
                          pendingLabel={d.calendar.booking}
                        >
                          {d.calendar.bookThisTime}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
