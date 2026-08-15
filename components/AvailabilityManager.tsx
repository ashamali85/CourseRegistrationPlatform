'use client';

import { useActionState } from 'react';
import {
  createSlotAction,
  deleteSlotAction,
  type ActionState
} from '@/lib/actions/admin-actions';
import { formatDate, formatTime } from '@/lib/format';
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
  const [state, formAction] = useActionState<ActionState, FormData>(createSlotAction, {});

  return (
    <div className="card">
      <div className="section-title">
        <h3>Add availability</h3>
      </div>

      <form action={formAction}>
        <FormAlert error={state.error} message={state.message} />

        <div className="grid-2 mt-4">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" required />
            {state.fieldErrors?.date && <p className="field-error">{state.fieldErrors.date}</p>}
          </div>

          <div className="field">
            <label htmlFor="capacity">Seats</label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={100}
              defaultValue={1}
              required
            />
            <p className="small muted mt-2">1 for one-to-one sessions.</p>
            {state.fieldErrors?.capacity && (
              <p className="field-error">{state.fieldErrors.capacity}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="startTime">Starts</label>
            <input id="startTime" name="startTime" type="time" required />
            {state.fieldErrors?.startTime && (
              <p className="field-error">{state.fieldErrors.startTime}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="endTime">Ends</label>
            <input id="endTime" name="endTime" type="time" required />
            {state.fieldErrors?.endTime && (
              <p className="field-error">{state.fieldErrors.endTime}</p>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="courseId">Course</label>
          <select id="courseId" name="courseId" defaultValue="">
            <option value="">Any published course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <p className="small muted mt-2">
            Leave as &ldquo;Any&rdquo; and this time shows up for every published course.
          </p>
          {state.fieldErrors?.courseId && (
            <p className="field-error">{state.fieldErrors.courseId}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input id="note" name="note" maxLength={200} placeholder="Shown to students" />
        </div>

        <SubmitButton pendingLabel="Adding…">Add time slot</SubmitButton>
      </form>
    </div>
  );
}

function SlotRow({ slot }: { slot: AdminSlot }) {
  const [state, formAction] = useActionState<ActionState, FormData>(deleteSlotAction, {});
  const full = slot.booked >= slot.capacity;

  return (
    <tr>
      <td>
        <strong>{formatDate(slot.startsAt)}</strong>
        <br />
        <span className="muted small">
          {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
        </span>
      </td>
      <td>
        {slot.courseTitle ? (
          <span className="pill pill-brand">{slot.courseTitle}</span>
        ) : (
          <span className="pill pill-muted">Any course</span>
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
          <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Removing…">
            Remove
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
  return (
    <div className="stack">
      <AddSlotForm courses={courses} />

      <div className="card">
        <div className="section-title">
          <h3>Upcoming slots</h3>
          <span className="muted small">{slots.length} scheduled</span>
        </div>

        {slots.length === 0 ? (
          <div className="empty">
            <h3>Nothing scheduled</h3>
            <p>Add a time slot above and students will see it on the course calendar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Course</th>
                  <th>Booked</th>
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
