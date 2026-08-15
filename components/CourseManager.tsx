'use client';

import { useActionState, useState } from 'react';
import {
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
  type ActionState
} from '@/lib/actions/admin-actions';
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
  return (
    <>
      <div className="field">
        <label htmlFor={`title-${course?.id ?? 'new'}`}>Course title</label>
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
        <label htmlFor={`summary-${course?.id ?? 'new'}`}>Short summary</label>
        <input
          id={`summary-${course?.id ?? 'new'}`}
          name="summary"
          defaultValue={course?.summary ?? ''}
          maxLength={200}
          placeholder="One line students see in the course list"
        />
        {errors?.summary && <p className="field-error">{errors.summary}</p>}
      </div>

      <div className="field">
        <label htmlFor={`description-${course?.id ?? 'new'}`}>Full description</label>
        <textarea
          id={`description-${course?.id ?? 'new'}`}
          name="description"
          defaultValue={course?.description ?? ''}
          maxLength={4000}
        />
        {errors?.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="field">
        <label htmlFor={`duration-${course?.id ?? 'new'}`}>Session length (minutes)</label>
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
          Published — students can see and book this
        </label>
      </div>
    </>
  );
}

function NewCourseForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createCourseAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add a course
      </button>
    );
  }

  return (
    <div className="card card-tint">
      <div className="section-title">
        <h3>New course</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <form action={formAction}>
        <FormAlert error={state.error} message={state.message} />
        <div className="mt-4">
          <CourseFields errors={state.fieldErrors} />
        </div>
        <SubmitButton pendingLabel="Creating…">Create course</SubmitButton>
      </form>
    </div>
  );
}

function CourseRow({ course }: { course: AdminCourse }) {
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
              <span className="pill pill-ok">Published</span>
            ) : (
              <span className="pill pill-muted">Draft</span>
            )}
          </div>
          {course.summary && <p className="muted small mt-2">{course.summary}</p>}
          <p className="muted small mt-2">
            {course.durationMinutes} min · {course.bookingCount} confirmed booking
            {course.bookingCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={course.id} />
            <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Deleting…">
              Delete
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
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        </form>
      )}
    </div>
  );
}

export default function CourseManager({ courses }: { courses: AdminCourse[] }) {
  return (
    <div className="stack">
      <NewCourseForm />
      {courses.length === 0 ? (
        <div className="card empty">
          <h3>No courses yet</h3>
          <p>Create your first course, then open Availability to add teaching times.</p>
        </div>
      ) : (
        courses.map((course) => <CourseRow key={course.id} course={course} />)
      )}
    </div>
  );
}
