'use client';

import { useActionState, useState } from 'react';
import {
  inviteStudentAction,
  setStudentActiveAction,
  deleteUnverifiedStudentAction,
  type ActionState
} from '@/lib/actions/student-actions';
import { useI18n } from '@/components/I18nProvider';
import { useConfirmSubmit } from '@/components/ConfirmProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  bookingCount: number;
  joined: string;
};

function InviteForm() {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    inviteStudentAction,
    {}
  );
  useBusyWhile(pending);
  const confirmed = useConfirmSubmit(d.students.confirmInvite);

  return (
    <div className="card card-tint">
      <div className="section-title">
        <h3>{d.students.addStudent}</h3>
      </div>
      <form ref={confirmed.formRef} action={formAction} onSubmit={confirmed.onSubmit}>
        <FormAlert error={state.error} message={state.message} />
        <div className="grid-2 mt-4">
          <div className="field">
            <label htmlFor="student-name">{d.students.name}</label>
            <input id="student-name" name="name" type="text" required maxLength={80} />
            {state.fieldErrors?.name && (
              <p className="field-error">{state.fieldErrors.name}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="student-email">{d.students.email}</label>
            <input id="student-email" name="email" type="email" required maxLength={160} />
            {state.fieldErrors?.email && (
              <p className="field-error">{state.fieldErrors.email}</p>
            )}
          </div>
        </div>
        <SubmitButton>{d.students.sendInvite}</SubmitButton>
      </form>
    </div>
  );
}

function StudentRowItem({ student }: { student: StudentRow }) {
  const { d } = useI18n();
  const [activeState, activeAction, activePending] = useActionState<ActionState, FormData>(
    setStudentActiveAction,
    {}
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteUnverifiedStudentAction,
    {}
  );
  useBusyWhile(activePending || deletePending);

  const toggleConfirm = useConfirmSubmit({
    message: student.isActive ? d.students.confirmDeactivate : d.students.confirmActivate,
    confirmLabel: student.isActive ? d.students.deactivate : d.students.activate,
    tone: student.isActive ? 'danger' : 'default'
  });
  const removeConfirm = useConfirmSubmit({
    message: d.students.confirmRemove,
    confirmLabel: d.students.remove,
    tone: 'danger'
  });

  // Only an account that never confirmed and never booked can be removed —
  // this is the cleanup path for automated sign-ups.
  const removable = !student.emailVerified && student.bookingCount === 0;

  return (
    <tr>
      <td>
        <strong>{student.name}</strong>
        <br />
        <span className="muted small ltr-text">{student.email}</span>
      </td>
      <td>
        {student.emailVerified ? (
          <span className="pill pill-ok">{d.students.verified}</span>
        ) : (
          <span className="pill pill-warn">{d.students.unverified}</span>
        )}
      </td>
      <td>
        {student.isActive ? (
          <span className="pill pill-brand">{d.students.active}</span>
        ) : (
          <span className="pill pill-muted">{d.students.inactive}</span>
        )}
      </td>
      <td>
        {student.bookingCount} {d.students.bookings}
      </td>
      <td className="ltr-text">{student.joined}</td>
      <td>
        <div className="row wrap">
          <form
            ref={toggleConfirm.formRef}
            action={activeAction}
            onSubmit={toggleConfirm.onSubmit}
          >
            <input type="hidden" name="id" value={student.id} />
            <input type="hidden" name="active" value={String(!student.isActive)} />
            <SubmitButton className="btn btn-ghost btn-sm">
              {student.isActive ? d.students.deactivate : d.students.activate}
            </SubmitButton>
          </form>

          {removable && (
            <form
              ref={removeConfirm.formRef}
              action={deleteAction}
              onSubmit={removeConfirm.onSubmit}
            >
              <input type="hidden" name="id" value={student.id} />
              <SubmitButton className="btn btn-danger btn-sm">
                {d.students.remove}
              </SubmitButton>
            </form>
          )}
        </div>
        {activeState.error && <p className="field-error">{activeState.error}</p>}
        {deleteState.error && <p className="field-error">{deleteState.error}</p>}
      </td>
    </tr>
  );
}

export default function StudentManager({ students }: { students: StudentRow[] }) {
  const { d } = useI18n();
  const [onlyUnverified, setOnlyUnverified] = useState(false);

  const shown = onlyUnverified
    ? students.filter((s) => !s.emailVerified && s.bookingCount === 0)
    : students;

  const suspicious = students.filter(
    (s) => !s.emailVerified && s.bookingCount === 0
  ).length;

  return (
    <div className="stack">
      <InviteForm />

      {suspicious > 0 && (
        <div className="alert alert-warn">
          <div className="row-between wrap">
            <span>
              {suspicious} · {d.students.suspicious}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOnlyUnverified((v) => !v)}
            >
              {onlyUnverified ? d.common.close : d.students.unverified}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {shown.length === 0 ? (
          <div className="empty">
            <h3>{d.students.emptyTitle}</h3>
            <p>{d.students.emptyBody}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{d.students.name}</th>
                  <th>{d.students.email}</th>
                  <th>{d.common.status}</th>
                  <th>{d.students.bookings}</th>
                  <th>{d.students.joined}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((student) => (
                  <StudentRowItem key={student.id} student={student} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
