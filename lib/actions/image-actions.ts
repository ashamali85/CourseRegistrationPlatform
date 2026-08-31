'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getT } from '@/lib/locale';
import { idSchema } from '@/lib/validation';
import {
  inspectImage,
  isBlobConfigured,
  MAX_IMAGES_PER_COURSE
} from '@/lib/images';

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export async function uploadCourseImageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  if (!isBlobConfigured()) return { error: d.images.notConfigured };

  const courseId = idSchema(d).safeParse({ id: formData.get('courseId') });
  if (!courseId.success) return { error: d.errors.unknownCourse };

  const course = await prisma.course.findUnique({
    where: { id: courseId.data.id },
    include: { _count: { select: { images: true } } }
  });
  if (!course) return { error: d.errors.courseGone };

  if (course._count.images >= MAX_IMAGES_PER_COURSE) {
    return { error: d.images.tooMany };
  }

  // 'thumbnail' fills the cover slot; anything else appends to the gallery.
  const asThumbnail = formData.get('role') === 'thumbnail';

  const file = formData.get('file');
  if (!(file instanceof File)) return { error: d.images.chooseFile };

  const check = await inspectImage(file);
  if (!check.ok) {
    const message =
      check.reason === 'too-large'
        ? d.images.tooLarge
        : check.reason === 'empty'
          ? d.images.chooseFile
          : d.images.badType;
    return { error: message };
  }

  try {
    // Random path: predictable names would let anyone enumerate every course
    // image, and would collide when two uploads share a filename.
    const key = `courses/${course.id}/${randomBytes(12).toString('hex')}.${check.extension}`;

    const blob = await put(key, file, {
      access: 'public',
      contentType: check.type,
      // The sniffed extension is already unique; a suffix would only make the
      // stored pathname disagree with what we record.
      addRandomSuffix: false
    });

    const last = await prisma.courseImage.findFirst({
      where: { courseId: course.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });

    await prisma.$transaction([
      // A course has one cover. Uploading a new one demotes the old to the
      // gallery rather than deleting it — the picture is still useful.
      ...(asThumbnail
        ? [
            prisma.courseImage.updateMany({
              where: { courseId: course.id, isThumbnail: true },
              data: { isThumbnail: false }
            })
          ]
        : []),
      prisma.courseImage.create({
        data: {
          courseId: course.id,
          url: blob.url,
          pathname: blob.pathname,
          alt: course.title,
          isThumbnail: asThumbnail,
          sortOrder: (last?.sortOrder ?? -1) + 1
        }
      })
    ]);

    await recordAudit({
      actorUserId: admin.id,
      action: 'UPLOAD_IMAGE',
      entityType: 'Course',
      entityId: course.id,
      entityName: course.title
    });
  } catch (error) {
    console.error('image upload failed', error);
    return { error: d.images.uploadFailed };
  }

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath(`/courses/${course.id}`);
  return { ok: true, message: d.images.uploaded };
}

export async function deleteCourseImageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownRecord };

  const image = await prisma.courseImage.findUnique({
    where: { id: parsed.data.id },
    include: { course: { select: { id: true, title: true } } }
  });
  if (!image) return { error: d.errors.unknownRecord };

  // The database row is what the site reads, so remove it even if the blob
  // delete fails — a stray file costs pennies, a broken image is visible.
  try {
    await del(image.url);
  } catch (error) {
    console.error('blob delete failed, removing record anyway', error);
  }

  await prisma.courseImage.delete({ where: { id: image.id } });

  await recordAudit({
    actorUserId: admin.id,
    action: 'DELETE_IMAGE',
    entityType: 'Course',
    entityId: image.course.id,
    entityName: image.course.title
  });

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath(`/courses/${image.course.id}`);
  return { ok: true, message: d.images.deleted };
}

/** Promote a gallery image to cover, demoting whichever held the slot. */
export async function setCourseThumbnailAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownRecord };

  const image = await prisma.courseImage.findUnique({
    where: { id: parsed.data.id }
  });
  if (!image) return { error: d.errors.unknownRecord };

  await prisma.$transaction([
    prisma.courseImage.updateMany({
      where: { courseId: image.courseId, isThumbnail: true },
      data: { isThumbnail: false }
    }),
    prisma.courseImage.update({
      where: { id: image.id },
      data: { isThumbnail: true }
    })
  ]);

  await recordAudit({
    actorUserId: admin.id,
    action: 'SET_THUMBNAIL',
    entityType: 'Course',
    entityId: image.courseId
  });

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath(`/courses/${image.courseId}`);
  return { ok: true, message: d.images.thumbnailSet };
}
