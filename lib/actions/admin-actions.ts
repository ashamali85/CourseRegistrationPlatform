'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { courseSchema, slotSchema, idSchema, fieldErrors } from '@/lib/validation';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';
import { zonedInputToUtc } from '@/lib/time';
import { formatDateTime } from '@/lib/format';

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
  const { locale, d } = await getT();

  const parsed = courseSchema(d).safeParse({
    title: formData.get('title'),
    summary: formData.get('summary') ?? '',
    description: formData.get('description') ?? '',
    durationMinutes: formData.get('durationMinutes'),
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
    durationMinutes: formData.get('durationMinutes'),
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

// ---------------------------------------------------------------- availability

export async function createSlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const parsed = slotSchema(d).safeParse({
    date: formData.get('date'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    capacity: formData.get('capacity'),
    note: formData.get('note') ?? '',
    courseId: formData.get('courseId') ?? ''
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { date, startTime, endTime, capacity, note, courseId } = parsed.data;

  const startsAt = zonedInputToUtc(date, startTime);
  const endsAt = zonedInputToUtc(date, endTime);

  if (startsAt.getTime() < Date.now()) {
    return { fieldErrors: { date: d.errors.slotInPast } };
  }

  // A courseId of '' means "open to any published course". Anything else must
  // be a course that actually exists.
  let resolvedCourseId: string | null = null;
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { fieldErrors: { courseId: d.errors.courseGone } };
    resolvedCourseId = course.id;
  }

  // Overlap check — you cannot be in two places at once.
  const clash = await prisma.availabilitySlot.findFirst({
    where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }
  });
  if (clash) {
    return {
      error: fill(d.errors.slotOverlap, { when: formatDateTime(clash.startsAt, locale) })
    };
  }

  const slot = await prisma.availabilitySlot.create({
    data: { startsAt, endsAt, capacity, note, courseId: resolvedCourseId }
  });

  await recordAudit({
    actorUserId: admin.id,
    action: 'CREATE',
    entityType: 'AvailabilitySlot',
    entityId: slot.id,
    entityName: formatDateTime(slot.startsAt, locale)
  });

  revalidatePath('/admin/availability');
  revalidatePath('/courses');
  return { ok: true, message: fill(d.success.slotAdded, { when: formatDateTime(startsAt, locale) }) };
}

export async function deleteSlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const id = idSchema(d).safeParse({ id: formData.get('id') });
  if (!id.success) return { error: d.errors.unknownSlot };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: id.data.id },
    include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } }
  });
  if (!slot) return { error: d.errors.slotGone };

  if (slot._count.bookings > 0) {
    return { error: fill(d.errors.slotHasBookings, { n: slot._count.bookings }) };
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } });

  await recordAudit({
    actorUserId: admin.id,
    action: 'DELETE',
    entityType: 'AvailabilitySlot',
    entityId: slot.id,
    entityName: formatDateTime(slot.startsAt, locale)
  });

  revalidatePath('/admin/availability');
  revalidatePath('/courses');
  return { ok: true, message: d.success.slotRemoved };
}
