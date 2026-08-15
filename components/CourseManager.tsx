'use client';

import { useActionState, useState } from 'react';
import {
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
  type ActionState
} from '@/lib/actions/admin-actions';
import { useI18n } from '@/components/I18nProvider';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type AdminCourse = {
  id: string;
  title: string;
  summary: string;
  description: string;
  durationMinutes: number;
  isPublished: boolean;
  bookingCount: number;
};

function CourseFields({
  course,
  errors
}: {
  course?: AdminCourse;
  errors?: Record<string, string>;
}) {
  const { d } = useI18n();
  return (
    <>
      <div className="field">
        <label htmlFor={`title-${course?.id ?? 'new'}`}>{d.admin.courseTitle}</label>
        <input
          id={`title-${course?.id ?? 'new'}`}
          name="title"
          defaultValue={course?.title ?? ''}
          maxLength={120}
          required
        />
        {errors?.title && <p className="field-error">{errors.title}</p>}
      </div>

      <div className="field">
        <label htmlFor={`summary-${course?.id ?? 'new'}`}>{d.admin.shortSummary}</label>
        <input
          id={`summary-${course?.id ?? 'new'}`}
          name="summary"
          defaultValue={course?.summary ?? ''}
          maxLength={200}
          placeholder={d.admin.summaryPlaceholder}
        />
        {errors?.summary && <p className="field-error">{errors.summary}</p>}
      </div>

      <div className="field">
        <label htmlFor={`description-${course?.id ?? 'new'}`}>{d.admin.fullDescription}</label>
        <textarea
          id={`description-${course?.id ?? 'new'}`}
          name="description"
          defaultValue={course?.description ?? ''}
          maxLength={4000}
        />
        {errors?.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="field">
        <label htmlFor={`duration-${course?.id ?? 'new'}`}>{d.admin.sessionLength}</label>
        <input
          id={`duration-${course?.id ?? 'new'}`}
          name="durationMinutes"
          type="number"
          min={15}
          max={480}
          step={5}
          defaultValue={course?.durationMinutes ?? 60}
          required
        />
        {errors?.durationMinutes && <p className="field-error">{errors.durationMinutes}</p>}
      </div>

      <div className="checkbox-row field">
        <input
          id={`published-${course?.id ?? 'new'}`}
          name="isPublished"
          type="checkbox"
          defaultChecked={course?.isPublished ?? false}
        />
        <label htmlFor={`published-${course?.id ?? 'new'}`}>
          {d.admin.publishedLabel}
        </label>
      </div>
    </>
  );
}

function NewCourseForm() {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(createCourseAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        {d.admin.addCourse}
      </button>
    );
  }

  return (
    <div className="card card-tint">
      <div className="section-title">
        <h3>{d.admin.newCourse}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          {d.common.close}
        </button>
      </div>
      <form action={formAction}>
        <FormAlert error={state.error} message={state.message} />
        <div className="mt-4">
          <CourseFields errors={state.fieldErrors} />
        </div>
        <SubmitButton pendingLabel={d.common.creating}>{d.admin.createCourse}</SubmitButton>
      </form>
    </div>
  );
}

function CourseRow({ course }: { course: AdminCourse }) {
  const { d } = useI18n();
  const [editState, editAction] = useActionState<ActionState, FormData>(updateCourseAction, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteCourseAction,
    {}
  );
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <div className="row-between wrap">
        <div className="grow">
          <div className="row wrap">
            <h3>{course.title}</h3>
            {course.isPublished ? (
              <span className="pill pill-ok">{d.admin.published}</span>
            ) : (
              <span className="pill pill-muted">{d.admin.draft}</span>
            )}
          </div>
          {course.summary && <p className="muted small mt-2">{course.summary}</p>}
          <p className="muted small mt-2">
            {course.durationMinutes} {d.common.minutes} · {course.bookingCount}{' '}
            {course.bookingCount === 1
              ? d.admin.confirmedBooking
              : d.admin.confirmedBookingPlural}
          </p>
        </div>

        <div className="row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? d.common.close : d.common.edit}
          </button>
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(d.admin.confirmDeleteCourse)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={course.id} />
            <SubmitButton className="btn btn-danger btn-sm" pendingLabel={d.common.deleting}>
              {d.common.delete}
            </SubmitButton>
          </form>
        </div>
      </div>

      {deleteState.error && <div className="alert alert-error mt-4">{deleteState.error}</div>}

      {editing && (
        <form action={editAction} className="mt-4">
          <hr className="divider" />
          <FormAlert error={editState.error} message={editState.message} />
          <div className="mt-4">
            <input type="hidden" name="id" value={course.id} />
            <CourseFields course={course} errors={editState.fieldErrors} />
          </div>
          <SubmitButton pendingLabel={d.common.saving}>{d.admin.saveChanges}</SubmitButton>
        </form>
      )}
    </div>
  );
}

export default function CourseManager({ courses }: { courses: AdminCourse[] }) {
  const { d } = useI18n();
  return (
    <div className="stack">
      <NewCourseForm />
      {courses.length === 0 ? (
        <div className="card empty">
          <h3>{d.admin.noCoursesTitle}</h3>
          <p>{d.admin.noCoursesBody}</p>
        </div>
      ) : (
        courses.map((course) => <CourseRow key={course.id} course={course} />)
      )}
    </div>
  );
}
