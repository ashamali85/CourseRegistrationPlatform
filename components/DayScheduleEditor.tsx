'use client';

import { useActionState, useState } from 'react';
import {
  addDaySlotAction,
  deleteDaySlotAction,
  copyDayTimesAction,
  type ActionState
} from '@/lib/actions/schedule-actions';
import { useI18n } from '@/components/I18nProvider';
import { formatDateKey, formatTime } from '@/lib/format';
import { SESSION_HOURS } from '@/lib/time';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type DaySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  note: string;
};

export type ScheduleDay = {
  id: string;
  date: string;
  slots: DaySlot[];
};

function AddTimeForm({
  courseDayId,
  defaultHours
}: {
  courseDayId: string;
  defaultHours: number;
}) {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(addDaySlotAction, {});

  return (
    <form action={formAction} className="mt-2">
      <FormAlert error={state.error} message={state.message} />
      <div className="time-form mt-2">
        <div>
          <label htmlFor={`start-${courseDayId}`}>{d.admin.starts}</label>
          <input id={`start-${courseDayId}`} name="startTime" type="time" required />
          {state.fieldErrors?.startTime && (
            <p className="field-error">{state.fieldErrors.startTime}</p>
          )}
        </div>

        <div>
          <label htmlFor={`hours-${courseDayId}`}>{d.schedule.duration}</label>
          <select id={`hours-${courseDayId}`} name="sessionHours" defaultValue={defaultHours}>
            {SESSION_HOURS.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? d.schedule.hour : d.schedule.hours}
              </option>
            ))}
          </select>
          {state.fieldErrors?.sessionHours && (
            <p className="field-error">{state.fieldErrors.sessionHours}</p>
          )}
        </div>

        <div>
          <label htmlFor={`cap-${courseDayId}`}>{d.admin.seats}</label>
          <input
            id={`cap-${courseDayId}`}
            name="capacity"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            required
          />
          {state.fieldErrors?.capacity && (
            <p className="field-error">{state.fieldErrors.capacity}</p>
          )}
        </div>

        <input type="hidden" name="courseDayId" value={courseDayId} />
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel={d.common.adding}>
          {d.schedule.addTime}
        </SubmitButton>
      </div>
    </form>
  );
}

function TimeRow({ slot }: { slot: DaySlot }) {
  const { locale, d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteDaySlotAction,
    {}
  );
  const full = slot.booked >= slot.capacity;

  return (
    <div className="time-chip">
      <span className="time-chip-time ltr-text">
        {formatTime(slot.startsAt, locale)} – {formatTime(slot.endsAt, locale)}
      </span>
      <span className={`pill ${full ? 'pill-warn' : 'pill-ok'}`}>
        {slot.booked} / {slot.capacity}
      </span>
      <form action={formAction}>
        <input type="hidden" name="id" value={slot.id} />
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel={d.common.removing}>
          ✕
        </SubmitButton>
      </form>
      {state.error && <p className="field-error">{state.error}</p>}
    </div>
  );
}

function DayCard({
  day,
  defaultHours,
  isFirst
}: {
  day: ScheduleDay;
  defaultHours: number;
  isFirst: boolean;
}) {
  const { locale, d } = useI18n();
  const [open, setOpen] = useState(isFirst);
  const [copyState, copyAction] = useActionState<ActionState, FormData>(
    copyDayTimesAction,
    {}
  );

  return (
    <div className="card">
      <div className="row-between wrap">
        <div className="grow">
          <h3>{formatDateKey(day.date, locale)}</h3>
          <p className="muted small mt-2">
            {day.slots.length === 0
              ? d.schedule.noTimesSet
              : `${day.slots.length} ${d.schedule.timesSet}`}
          </p>
        </div>
        <div className="row">
          {day.slots.length > 0 && (
            <form action={copyAction}>
              <input type="hidden" name="id" value={day.id} />
              <SubmitButton
                className="btn btn-ghost btn-sm"
                pendingLabel={d.common.working}
              >
                {d.schedule.copyToAll}
              </SubmitButton>
            </form>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? d.common.close : d.schedule.setTimes}
          </button>
        </div>
      </div>

      {copyState.error && <div className="alert alert-error mt-2">{copyState.error}</div>}
      {copyState.message && <div className="alert alert-ok mt-2">{copyState.message}</div>}

      {day.slots.length > 0 && (
        <div className="time-list mt-4">
          {day.slots.map((slot) => (
            <TimeRow key={slot.id} slot={slot} />
          ))}
        </div>
      )}

      {open && (
        <>
          <hr className="divider" />
          <AddTimeForm courseDayId={day.id} defaultHours={defaultHours} />
        </>
      )}
    </div>
  );
}

export default function DayScheduleEditor({
  days,
  defaultHours
}: {
  days: ScheduleDay[];
  defaultHours: number;
}) {
  const { d } = useI18n();

  if (days.length === 0) {
    return (
      <div className="card empty">
        <h3>{d.schedule.noDaysTitle}</h3>
        <p>{d.schedule.noDaysBody}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="alert alert-info">{d.schedule.perDayHint}</div>
      {days.map((day, i) => (
        <DayCard key={day.id} day={day} defaultHours={defaultHours} isFirst={i === 0} />
      ))}
    </div>
  );
}
