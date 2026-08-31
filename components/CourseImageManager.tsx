'use client';

import { useActionState } from 'react';
import {
  deleteCourseImageAction,
  setCourseThumbnailAction,
  type ActionState
} from '@/lib/actions/image-actions';
import { useI18n } from '@/components/I18nProvider';
import { useConfirmSubmit } from '@/components/ConfirmProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import { MAX_IMAGES_PER_COURSE } from '@/lib/images';
import ImageDropzone from '@/components/ImageDropzone';
import SubmitButton from '@/components/SubmitButton';

export type AdminImage = {
  id: string;
  url: string;
  alt: string;
  isThumbnail: boolean;
};

function ImageTile({
  image,
  showPromote
}: {
  image: AdminImage;
  showPromote: boolean;
}) {
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
    <div className={`image-tile${image.isThumbnail ? ' is-thumbnail' : ''}`}>
      <img src={image.url} alt={image.alt} loading="lazy" />

      <form
        ref={removeConfirm.formRef}
        action={deleteAction}
        onSubmit={removeConfirm.onSubmit}
        className="image-remove"
      >
        <input type="hidden" name="id" value={image.id} />
        <SubmitButton className="image-remove-btn" aria-label={d.common.delete}>
          ✕
        </SubmitButton>
      </form>

      {showPromote && (
        <div className="image-tile-actions">
          <form action={thumbAction}>
            <input type="hidden" name="id" value={image.id} />
            <SubmitButton className="btn btn-ghost btn-sm btn-block">
              {d.images.makeThumbnail}
            </SubmitButton>
          </form>
        </div>
      )}

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

  // Fall back to the first image if no flag is set, so a course never renders
  // without a cover just because the flag is missing.
  const thumbnail = images.find((image) => image.isThumbnail) ?? images[0] ?? null;
  const gallery = images.filter((image) => image.id !== thumbnail?.id);
  const full = images.length >= MAX_IMAGES_PER_COURSE;

  return (
    <div className="mt-4">
      <hr className="divider" />

      {!blobConfigured ? (
        <>
          <h4 className="images-heading">{d.images.title}</h4>
          <div className="alert alert-warn mt-2">{d.images.notConfigured}</div>
        </>
      ) : (
        <div className="stack">
          {/* --- cover --- */}
          <section>
            <div className="row-between wrap">
              <h4 className="images-heading">{d.images.thumbnailTitle}</h4>
            </div>
            <p className="small muted mt-2">{d.images.thumbnailHint}</p>

            <div className="image-grid mt-2">
              {thumbnail && <ImageTile image={thumbnail} showPromote={false} />}
              {!full && (
                <ImageDropzone
                  courseId={courseId}
                  role="thumbnail"
                  label={thumbnail ? d.images.replaceThumbnail : d.images.addThumbnail}
                  hint={d.images.dropHint}
                />
              )}
            </div>
          </section>

          {/* --- gallery --- */}
          <section className="mt-4">
            <div className="row-between wrap">
              <h4 className="images-heading">{d.images.galleryTitle}</h4>
              <span className="muted small">
                {images.length} / {MAX_IMAGES_PER_COURSE}
              </span>
            </div>
            <p className="small muted mt-2">{d.images.galleryHint}</p>

            <div className="image-grid mt-2">
              {gallery.map((image) => (
                <ImageTile key={image.id} image={image} showPromote />
              ))}
              {!full && (
                <ImageDropzone
                  courseId={courseId}
                  role="gallery"
                  label={d.images.addImage}
                  hint={d.images.dropHint}
                />
              )}
            </div>

            {full && <p className="small muted mt-2">{d.images.tooMany}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
