'use client';

import { useActionState, useMemo, useState } from 'react';
import { bookSlotAction, type ActionState } from '@/lib/actions/booking-actions';
import { formatTime, dayKey } from '@/lib/format';
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

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SlotCalendar({
  courseId,
  slots
}: {
  courseId: string;
  slots: CalendarSlot[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(bookSlotAction, {});

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

  // Build the month grid, Monday-first.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(viewYear, viewMonth, 1));
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const leading = (first.getUTCDay() + 6) % 7; // Sun=0 -> Mon-first

    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < leading; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ key, day: d });
    }
    return out;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  const selectedSlots = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  if (slots.length === 0) {
    return (
      <div className="empty">
        <h3>No times available yet</h3>
        <p>There are no open slots for this course right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="calendar">
        <div className="calendar-head">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="calendar-month">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="calendar-grid">
          {DOW.map((d) => (
            <div key={d} className="calendar-dow">
              {d}
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
                aria-label={`${cell.day} ${MONTHS[viewMonth]}${hasSlots ? `, ${daySlots.length} time(s) available` : ', no times'}`}
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
            <h3>Times on {selectedDay}</h3>
            <span className="muted small">{selectedSlots.length} available</span>
          </div>

          {selectedSlots.length === 0 ? (
            <p className="muted">Nothing open on this day.</p>
          ) : (
            <div className="slot-list">
              {selectedSlots.map((slot) => {
                const full = slot.seatsLeft <= 0;
                return (
                  <div
                    key={slot.id}
                    className={`slot-card${full && !slot.bookedByMe ? ' is-full' : ''}`}
                  >
                    <div className="slot-time">
                      {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                    </div>

                    <div className="mt-2">
                      {slot.bookedByMe ? (
                        <span className="pill pill-ok">Booked by you</span>
                      ) : full ? (
                        <span className="pill pill-muted">Fully booked</span>
                      ) : (
                        <span className="pill pill-brand">
                          {slot.seatsLeft} of {slot.capacity} left
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
                          pendingLabel="Booking…"
                        >
                          Book this time
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
