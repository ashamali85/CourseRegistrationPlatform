'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { courseSchema, slotSchema, idSchema, fieldErrors } from '@/lib/validation';
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

  const parsed = courseSchema.safeParse({
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
  return { ok: true, message: `Created "${course.title}".` };
}

export async function updateCourseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const id = idSchema.safeParse({ id: formData.get('id') });
  if (!id.success) return { error: 'Unknown course.' };

  const parsed = courseSchema.safeParse({
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
  return { ok: true, message: `Saved "${course.title}".` };
}

export async function deleteCourseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const id = idSchema.safeParse({ id: formData.get('id') });
  if (!id.success) return { error: 'Unknown course.' };

  const confirmed = await prisma.booking.count({
    where: { courseId: id.data.id, status: 'CONFIRMED' }
  });
  if (confirmed > 0) {
    return {
      error: `This course has ${confirmed} confirmed booking(s). Unpublish it instead of deleting it.`
    };
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
  return { ok: true, message: `Deleted "${course.title}".` };
}

// ---------------------------------------------------------------- availability

export async function createSlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const parsed = slotSchema.safeParse({
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
    return { fieldErrors: { date: 'That time is in the past.' } };
  }

  // A courseId of '' means "open to any published course". Anything else must
  // be a course that actually exists.
  let resolvedCourseId: string | null = null;
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { fieldErrors: { courseId: 'That course no longer exists.' } };
    resolvedCourseId = course.id;
  }

  // Overlap check — you cannot be in two places at once.
  const clash = await prisma.availabilitySlot.findFirst({
    where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }
  });
  if (clash) {
    return {
      error: `That overlaps an existing slot on ${formatDateTime(clash.startsAt)}.`
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
    entityName: formatDateTime(slot.startsAt)
  });

  revalidatePath('/admin/availability');
  revalidatePath('/courses');
  return { ok: true, message: `Added ${formatDateTime(startsAt)}.` };
}

export async function deleteSlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const id = idSchema.safeParse({ id: formData.get('id') });
  if (!id.success) return { error: 'Unknown time slot.' };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: id.data.id },
    include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } }
  });
  if (!slot) return { error: 'That time slot no longer exists.' };

  if (slot._count.bookings > 0) {
    return {
      error: `${slot._count.bookings} student(s) booked this slot. Cancel their bookings first.`
    };
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } });

  await recordAudit({
    actorUserId: admin.id,
    action: 'DELETE',
    entityType: 'AvailabilitySlot',
    entityId: slot.id,
    entityName: formatDateTime(slot.startsAt)
  });

  revalidatePath('/admin/availability');
  revalidatePath('/courses');
  return { ok: true, message: 'Time slot removed.' };
}
