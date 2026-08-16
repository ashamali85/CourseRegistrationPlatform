'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { courseSchema, idSchema, fieldErrors } from '@/lib/validation';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// --------------------------------------------------------------------- courses

export async function createCourseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = courseSchema(d).safeParse({
    title: formData.get('title'),
    summary: formData.get('summary') ?? '',
    description: formData.get('description') ?? '',
    sessionHours: formData.get('sessionHours'),
    isPublished: formData.get('isPublished') === 'on'
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const course = await prisma.course.create({ data: parsed.data });

  await recordAudit({
    actorUserId: admin.id,
    action: 'CREATE',
    entityType: 'Course',
    entityId: course.id,
    entityName: course.title
  });

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  return { ok: true, message: fill(d.success.created, { name: course.title }) };
}

export async function updateCourseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const id = idSchema(d).safeParse({ id: formData.get('id') });
  if (!id.success) return { error: d.errors.unknownCourse };

  const parsed = courseSchema(d).safeParse({
    title: formData.get('title'),
    summary: formData.get('summary') ?? '',
    description: formData.get('description') ?? '',
    sessionHours: formData.get('sessionHours'),
    isPublished: formData.get('isPublished') === 'on'
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const course = await prisma.course.update({
    where: { id: id.data.id },
    data: parsed.data
  });

  await recordAudit({
    actorUserId: admin.id,
    action: 'UPDATE',
    entityType: 'Course',
    entityId: course.id,
    entityName: course.title
  });

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  return { ok: true, message: fill(d.success.saved, { name: course.title }) };
}

export async function deleteCourseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const id = idSchema(d).safeParse({ id: formData.get('id') });
  if (!id.success) return { error: d.errors.unknownCourse };

  const confirmed = await prisma.booking.count({
    where: { courseId: id.data.id, status: 'CONFIRMED' }
  });
  if (confirmed > 0) {
    return { error: fill(d.errors.courseHasBookings, { n: confirmed }) };
  }

  const course = await prisma.course.delete({ where: { id: id.data.id } });

  await recordAudit({
    actorUserId: admin.id,
    action: 'DELETE',
    entityType: 'Course',
    entityId: course.id,
    entityName: course.title
  });

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  return { ok: true, message: fill(d.success.deleted, { name: course.title }) };
}
