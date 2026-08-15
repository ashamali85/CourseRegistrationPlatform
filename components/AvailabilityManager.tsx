'use client';

import { useActionState } from 'react';
import {
  createSlotAction,
  deleteSlotAction,
  type ActionState
} from '@/lib/actions/admin-actions';
import { formatDate, formatTime } from '@/lib/format';
import { useI18n } from '@/components/I18nProvider';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type AdminSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  note: string;
  courseTitle: string | null;
};

export type CourseOption = { id: string; title: string };

function AddSlotForm({ courses }: { courses: CourseOption[] }) {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(createSlotAction, {});

  return (
    <div className="card">
      <div className="section-title">
        <h3>{d.admin.addAvailability}</h3>
      </div>

      <form action={formAction}>
        <FormAlert error={state.error} message={state.message} />

        <div className="grid-2 mt-4">
          <div className="field">
            <label htmlFor="date">{d.admin.date}</label>
            <input id="date" name="date" type="date" required />
            {state.fieldErrors?.date && <p className="field-error">{state.fieldErrors.date}</p>}
          </div>

          <div className="field">
            <label htmlFor="capacity">{d.admin.seats}</label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={100}
              defaultValue={1}
              required
            />
            <p className="small muted mt-2">{d.admin.seatsHint}</p>
            {state.fieldErrors?.capacity && (
              <p className="field-error">{state.fieldErrors.capacity}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="startTime">{d.admin.starts}</label>
            <input id="startTime" name="startTime" type="time" required />
            {state.fieldErrors?.startTime && (
              <p className="field-error">{state.fieldErrors.startTime}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="endTime">{d.admin.ends}</label>
            <input id="endTime" name="endTime" type="time" required />
            {state.fieldErrors?.endTime && (
              <p className="field-error">{state.fieldErrors.endTime}</p>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="courseId">{d.common.course}</label>
          <select id="courseId" name="courseId" defaultValue="">
            <option value="">{d.admin.anyCourse}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <p className="small muted mt-2">
            {d.admin.anyCourseHint}
          </p>
          {state.fieldErrors?.courseId && (
            <p className="field-error">{state.fieldErrors.courseId}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="note">{d.admin.note}</label>
          <input id="note" name="note" maxLength={200} placeholder={d.admin.notePlaceholder} />
        </div>

        <SubmitButton pendingLabel={d.common.adding}>{d.admin.addSlot}</SubmitButton>
      </form>
    </div>
  );
}

function SlotRow({ slot }: { slot: AdminSlot }) {
  const { locale, d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(deleteSlotAction, {});
  const full = slot.booked >= slot.capacity;

  return (
    <tr>
      <td>
        <strong>{formatDate(slot.startsAt, locale)}</strong>
        <br />
        <span className="muted small ltr-text">
          {formatTime(slot.startsAt, locale)} – {formatTime(slot.endsAt, locale)}
        </span>
      </td>
      <td>
        {slot.courseTitle ? (
          <span className="pill pill-brand">{slot.courseTitle}</span>
        ) : (
          <span className="pill pill-muted">{d.admin.anyCourseTag}</span>
        )}
        {slot.note && <div className="small muted mt-2">{slot.note}</div>}
      </td>
      <td>
        <span className={`pill ${full ? 'pill-warn' : 'pill-ok'}`}>
          {slot.booked} / {slot.capacity}
        </span>
      </td>
      <td>
        <form action={formAction}>
          <input type="hidden" name="id" value={slot.id} />
          <SubmitButton className="btn btn-danger btn-sm" pendingLabel={d.common.removing}>
            {d.common.remove}
          </SubmitButton>
        </form>
        {state.error && <p className="field-error">{state.error}</p>}
      </td>
    </tr>
  );
}

export default function AvailabilityManager({
  slots,
  courses
}: {
  slots: AdminSlot[];
  courses: CourseOption[];
}) {
  const { d } = useI18n();
  return (
    <div className="stack">
      <AddSlotForm courses={courses} />

      <div className="card">
        <div className="section-title">
          <h3>{d.admin.upcomingSlotsTitle}</h3>
          <span className="muted small">
            {slots.length} {d.admin.scheduled}
          </span>
        </div>

        {slots.length === 0 ? (
          <div className="empty">
            <h3>{d.admin.noSlotsTitle}</h3>
            <p>{d.admin.noSlotsBody}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{d.common.when}</th>
                  <th>{d.common.course}</th>
                  <th>{d.admin.booked}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <SlotRow key={slot.id} slot={slot} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
