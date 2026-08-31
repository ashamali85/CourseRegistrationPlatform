'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
  type ActionState
} from '@/lib/actions/admin-actions';
import { useI18n } from '@/components/I18nProvider';
import { useConfirmSubmit } from '@/components/ConfirmProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import { SESSION_HOURS } from '@/lib/time';
import CourseImageManager, { type AdminImage } from '@/components/CourseImageManager';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type AdminCourse = {
  id: string;
  title: string;
  summary: string;
  description: string;
  sessionHours: number;
  isPublished: boolean;
  bookingCount: number;
  dayCount: number;
  firstDay: string | null;
  lastDay: string | null;
  images: AdminImage[];
};

/**
 * Shared field set. Wrapped in a width-limited column: a form stretched across
 * the full page width gives lines far longer than is comfortable to read, and
 * makes short inputs like a duration select look absurd.
 */
function CourseFields({
  course,
  errors
}: {
  course?: AdminCourse;
  errors?: Record<string, string>;
}) {
  const { d } = useI18n();
  const key = course?.id ?? 'new';

  return (
    <div className="form-body">
      <div className="field">
        <label htmlFor={`title-${key}`}>{d.admin.courseTitle}</label>
        <input
          id={`title-${key}`}
          name="title"
          defaultValue={course?.title ?? ''}
          maxLength={120}
          required
        />
        {errors?.title && <p className="field-error">{errors.title}</p>}
      </div>

      <div className="field">
        <label htmlFor={`summary-${key}`}>{d.admin.shortSummary}</label>
        <input
          id={`summary-${key}`}
          name="summary"
          defaultValue={course?.summary ?? ''}
          maxLength={200}
          placeholder={d.admin.summaryPlaceholder}
        />
        {errors?.summary && <p className="field-error">{errors.summary}</p>}
      </div>

      <div className="field">
        <label htmlFor={`description-${key}`}>{d.admin.fullDescription}</label>
        <textarea
          id={`description-${key}`}
          name="description"
          defaultValue={course?.description ?? ''}
          maxLength={4000}
          rows={5}
        />
        {errors?.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="form-row-2">
        <div className="field">
          <label htmlFor={`hours-${key}`}>{d.schedule.sessionLength}</label>
          <select
            id={`hours-${key}`}
            name="sessionHours"
            defaultValue={course?.sessionHours ?? 1}
          >
            {SESSION_HOURS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} {hours === 1 ? d.schedule.hour : d.schedule.hours}
              </option>
            ))}
          </select>
          {errors?.sessionHours && <p className="field-error">{errors.sessionHours}</p>}
        </div>

        <div className="field">
          <label htmlFor={`published-${key}`}>{d.common.status}</label>
          <label className="switch-row" htmlFor={`published-${key}`}>
            <input
              id={`published-${key}`}
              name="isPublished"
              type="checkbox"
              defaultChecked={course?.isPublished ?? false}
            />
            <span>{d.admin.publishedLabel}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function NewCourseForm() {
  const { d } = useI18n();
  const [state, formAction, creating] = useActionState<ActionState, FormData>(
    createCourseAction,
    {}
  );
  useBusyWhile(creating);
  const [open, setOpen] = useState(false);
  const createConfirm = useConfirmSubmit(d.admin.confirmCreateCourse);

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

      <form ref={createConfirm.formRef} action={formAction} onSubmit={createConfirm.onSubmit}>
        <div className="form-body">
          <FormAlert error={state.error} message={state.message} />
        </div>
        <div className="mt-4">
          <CourseFields errors={state.fieldErrors} />
        </div>
        <div className="form-actions">
          <SubmitButton pendingLabel={d.common.creating}>{d.admin.createCourse}</SubmitButton>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            {d.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

function CourseRow({
  course,
  blobConfigured
}: {
  course: AdminCourse;
  blobConfigured: boolean;
}) {
  const { d } = useI18n();
  const [editState, editAction, saving] = useActionState<ActionState, FormData>(
    updateCourseAction,
    {}
  );
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(
    deleteCourseAction,
    {}
  );
  useBusyWhile(saving || deleting);

  const [editing, setEditing] = useState(false);
  const saveConfirm = useConfirmSubmit(d.admin.confirmSaveCourse);
  const deleteConfirm = useConfirmSubmit({
    message: d.admin.confirmDeleteCourse,
    confirmLabel: d.common.delete,
    tone: 'danger'
  });

  const thumbnail =
    course.images.find((image) => image.isThumbnail) ?? course.images[0] ?? null;

  return (
    <div className="card">
      <div className="course-head">
        {/* Thumbnail in the header gives the row an anchor and confirms at a
            glance which courses still have no cover image. */}
        {thumbnail ? (
          <img className="course-head-thumb" src={thumbnail.url} alt="" loading="lazy" />
        ) : (
          <div className="course-head-thumb course-head-thumb-empty">
            {d.images.noImage}
          </div>
        )}

        <div className="course-head-main">
          <div className="row wrap">
            <h3>{course.title}</h3>
            {course.isPublished ? (
              <span className="pill pill-ok">{d.admin.published}</span>
            ) : (
              <span className="pill pill-muted">{d.admin.draft}</span>
            )}
          </div>

          {course.summary && <p className="muted small mt-2">{course.summary}</p>}

          <div className="meta-chips">
            <span className="meta-chip">
              {course.sessionHours}{' '}
              {course.sessionHours === 1 ? d.schedule.hour : d.schedule.hours}
            </span>
            <span className="meta-chip">
              {course.dayCount > 0
                ? `${course.dayCount} ${d.schedule.daysCount}`
                : d.schedule.noSchedule}
            </span>
            <span className="meta-chip">
              {course.bookingCount}{' '}
              {course.bookingCount === 1
                ? d.admin.confirmedBooking
                : d.admin.confirmedBookingPlural}
            </span>
            <span className="meta-chip">
              {course.images.length} {d.images.image}
            </span>
          </div>
        </div>

        <div className="course-head-actions">
          <Link href={`/admin/courses/${course.id}/schedule`} className="btn btn-primary btn-sm">
            {d.schedule.manageSchedule}
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? d.common.close : d.common.edit}
          </button>
          <form
            ref={deleteConfirm.formRef}
            action={deleteAction}
            onSubmit={deleteConfirm.onSubmit}
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
        <>
          <hr className="divider" />
          <form ref={saveConfirm.formRef} action={editAction} onSubmit={saveConfirm.onSubmit}>
            <div className="form-body">
              <FormAlert error={editState.error} message={editState.message} />
            </div>
            <input type="hidden" name="id" value={course.id} />
            <CourseFields course={course} errors={editState.fieldErrors} />
            <div className="form-actions">
              <SubmitButton pendingLabel={d.common.saving}>{d.admin.saveChanges}</SubmitButton>
            </div>
          </form>

          {/* Its own forms, so it sits outside the edit form — a form inside a
              form is invalid and the inner one never submits. */}
          <CourseImageManager
            courseId={course.id}
            images={course.images}
            blobConfigured={blobConfigured}
          />
        </>
      )}
    </div>
  );
}

export default function CourseManager({
  courses,
  blobConfigured
}: {
  courses: AdminCourse[];
  blobConfigured: boolean;
}) {
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
        courses.map((course) => (
          <CourseRow key={course.id} course={course} blobConfigured={blobConfigured} />
        ))
      )}
    </div>
  );
}
