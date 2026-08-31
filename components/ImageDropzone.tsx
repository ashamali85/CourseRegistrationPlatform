'use client';

import { useActionState, useRef, useState } from 'react';
import { uploadCourseImageAction, type ActionState } from '@/lib/actions/image-actions';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from '@/lib/images';
import FormAlert from '@/components/FormAlert';

/**
 * Click-or-drag upload zone.
 *
 * The native <input type="file"> is visually hidden rather than removed: it is
 * still the thing that carries the file into the form post, and it keeps
 * keyboard and screen-reader behaviour for free. Only its appearance is
 * replaced — the browser's own control cannot be styled and renders its
 * "Choose File / No file chosen" text in the browser's language, not the
 * site's.
 */
export default function ImageDropzone({
  courseId,
  role,
  label,
  hint
}: {
  courseId: string;
  role: 'thumbnail' | 'gallery';
  label: string;
  hint: string;
}) {
  const { d } = useI18n();
  const [state, formAction, uploading] = useActionState<ActionState, FormData>(
    uploadCourseImageAction,
    {}
  );
  useBusyWhile(uploading);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /** Rejected here as well as on the server, so a bad file never leaves the browser. */
  function accept(file: File): boolean {
    setLocalError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError(d.images.tooLarge);
      return false;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setLocalError(d.images.badType);
      return false;
    }
    return true;
  }

  function submitWith(files: FileList) {
    const file = files[0];
    if (!file || !accept(file)) return;
    // Submitting on selection removes the pointless second click; the X on the
    // resulting tile is the undo.
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="role" value={role} />
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        name="file"
        accept={IMAGE_ACCEPT}
        onChange={(event) => {
          if (event.target.files?.length) submitWith(event.target.files);
        }}
      />

      <button
        type="button"
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files;
          if (!dropped.length) return;
          // Assigning to input.files is what puts a dragged file into the form
          // post; the drop event's copy is not submitted on its own.
          if (inputRef.current) inputRef.current.files = dropped;
          submitWith(dropped);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M21 15.5l-4.5-4.5L7 20.5" />
        </svg>
        <span className="dropzone-label">{label}</span>
        <span className="dropzone-hint">{hint}</span>
      </button>

      {(localError || state.error || state.message) && (
        <div className="mt-2">
          <FormAlert error={localError ?? state.error} message={state.message} />
        </div>
      )}
    </form>
  );
}
