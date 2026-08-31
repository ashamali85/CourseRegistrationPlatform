'use client';

import { useActionState, useRef } from 'react';
import {
  uploadCourseImageAction,
  deleteCourseImageAction,
  setCourseThumbnailAction,
  type ActionState
} from '@/lib/actions/image-actions';
import { useI18n } from '@/components/I18nProvider';
import { useConfirmSubmit } from '@/components/ConfirmProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, MAX_IMAGES_PER_COURSE } from '@/lib/images';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export type AdminImage = { id: string; url: string; alt: string };

function ImageTile({ image, isThumbnail }: { image: AdminImage; isThumbnail: boolean }) {
  const { d } = useI18n();
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(
    deleteCourseImageAction,
    {}
  );
  const [thumbState, thumbAction, setting] = useActionState<ActionState, FormData>(
    setCourseThumbnailAction,
    {}
  );
  useBusyWhile(deleting || setting);

  const removeConfirm = useConfirmSubmit({
    message: d.images.confirmDelete,
    confirmLabel: d.common.delete,
    tone: 'danger'
  });

  return (
    <div className={`image-tile${isThumbnail ? ' is-thumbnail' : ''}`}>
      <img src={image.url} alt={image.alt} loading="lazy" />

      {isThumbnail && <span className="image-badge">{d.images.thumbnail}</span>}

      <div className="image-tile-actions">
        {!isThumbnail && (
          <form action={thumbAction}>
            <input type="hidden" name="id" value={image.id} />
            <SubmitButton className="btn btn-ghost btn-sm">
              {d.images.makeThumbnail}
            </SubmitButton>
          </form>
        )}
        <form ref={removeConfirm.formRef} action={deleteAction} onSubmit={removeConfirm.onSubmit}>
          <input type="hidden" name="id" value={image.id} />
          <SubmitButton className="btn btn-danger btn-sm">✕</SubmitButton>
        </form>
      </div>

      {(deleteState.error || thumbState.error) && (
        <p className="field-error">{deleteState.error ?? thumbState.error}</p>
      )}
    </div>
  );
}

export default function CourseImageManager({
  courseId,
  images,
  blobConfigured
}: {
  courseId: string;
  images: AdminImage[];
  blobConfigured: boolean;
}) {
  const { d } = useI18n();
  const [state, formAction, uploading] = useActionState<ActionState, FormData>(
    uploadCourseImageAction,
    {}
  );
  useBusyWhile(uploading);
  const fileRef = useRef<HTMLInputElement>(null);

  const full = images.length >= MAX_IMAGES_PER_COURSE;

  return (
    <div className="mt-4">
      <hr className="divider" />
      <div className="row-between wrap">
        <h4 className="images-heading">{d.images.title}</h4>
        <span className="muted small">
          {images.length} / {MAX_IMAGES_PER_COURSE}
        </span>
      </div>
      <p className="small muted mt-2">{d.images.hint}</p>

      {!blobConfigured && (
        <div className="alert alert-warn mt-2">{d.images.notConfigured}</div>
      )}

      {images.length > 0 && (
        <div className="image-grid mt-4">
          {images.map((image, i) => (
            <ImageTile key={image.id} image={image} isThumbnail={i === 0} />
          ))}
        </div>
      )}

      {blobConfigured && !full && (
        <form action={formAction} className="mt-4">
          <FormAlert error={state.error} message={state.message} />
          <input type="hidden" name="courseId" value={courseId} />
          <div className="row wrap mt-2">
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept={IMAGE_ACCEPT}
              required
              // Rejected here as well as on the server, so an oversized file is
              // not uploaded only to be refused.
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size > MAX_IMAGE_BYTES) {
                  alert(d.images.tooLarge);
                  event.target.value = '';
                }
              }}
            />
            <SubmitButton className="btn btn-ghost btn-sm">
              {d.images.upload}
            </SubmitButton>
          </div>
        </form>
      )}

      {full && <p className="small muted mt-2">{d.images.tooMany}</p>}
    </div>
  );
}
