'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUserAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { bookSlotSchema, idSchema, fieldErrors } from '@/lib/validation';
import { formatDateTime } from '@/lib/format';

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Raised inside the transaction so we can return a clean message. */
class BookingError extends Error {}

export async function bookSlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUserAction();

  const parsed = bookSlotSchema.safeParse({
    slotId: formData.get('slotId'),
    courseId: formData.get('courseId'),
    notes: formData.get('notes') ?? ''
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { slotId, courseId, notes } = parsed.data;

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });
        if (!slot) throw new BookingError('That time slot is no longer available.');
        if (slot.startsAt.getTime() <= Date.now()) {
          throw new BookingError('That time slot has already started.');
        }

        const course = await tx.course.findUnique({ where: { id: courseId } });
        // Students must never be able to book an unpublished course by guessing
        // its id, even though it never appears in their course list.
        if (!course || !course.isPublished) {
          throw new BookingError('That course is not open for booking.');
        }
        if (slot.courseId && slot.courseId !== course.id) {
          throw new BookingError('That time slot is reserved for a different course.');
        }

        // If this student cancelled here before, reinstate rather than insert —
        // the (slotId, userId) unique index would otherwise reject them.
        const existing = await tx.booking.findUnique({
          where: { slotId_userId: { slotId, userId: user.id } }
        });
        if (existing && existing.status === 'CONFIRMED') {
          throw new BookingError('You have already booked this time slot.');
        }

        const taken = await tx.booking.count({
          where: { slotId, status: 'CONFIRMED' }
        });
        if (taken >= slot.capacity) {
          throw new BookingError('That time slot just filled up. Pick another one.');
        }

        if (existing) {
          return tx.booking.update({
            where: { id: existing.id },
            data: {
              status: 'CONFIRMED',
              courseId: course.id,
              notes,
              cancelledAt: null
            },
            include: { course: true, slot: true }
          });
        }

        const counter = await tx.counter.upsert({
          where: { name: 'booking' },
          create: { name: 'booking', value: 1 },
          update: { value: { increment: 1 } }
        });
        const reference = `BK-${String(counter.value).padStart(6, '0')}`;

        return tx.booking.create({
          data: {
            reference,
            userId: user.id,
            courseId: course.id,
            slotId: slot.id,
            notes,
            status: 'CONFIRMED'
          },
          include: { course: true, slot: true }
        });
      },
      {
        // The count-then-insert above is only safe under Serializable. With a
        // weaker level two students hitting the last seat simultaneously would
        // both read taken < capacity and both succeed.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10_000
      }
    );

    await recordAudit({
      actorUserId: user.id,
      action: 'BOOK',
      entityType: 'Booking',
      entityId: booking.id,
      entityName: booking.reference,
      details: `${booking.course.title} @ ${formatDateTime(booking.slot.startsAt)}`
    });

    revalidatePath('/bookings');
    revalidatePath(`/courses/${courseId}`);
    revalidatePath('/admin/bookings');

    return {
      ok: true,
      message: `Booked ${booking.course.title} for ${formatDateTime(booking.slot.startsAt)}. Reference ${booking.reference}.`
    };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 unique violation, P2034 serialization failure — both mean someone
      // else won the race for this seat.
      if (error.code === 'P2002' || error.code === 'P2034') {
        return { error: 'That time slot just filled up. Pick another one.' };
      }
    }

    console.error('booking failed', error);
    return { error: 'Something went wrong booking that slot. Try again.' };
  }
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUserAction();

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: 'Unknown booking.' };

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.id },
    include: { course: true, slot: true }
  });
  if (!booking) return { error: 'That booking no longer exists.' };

  // AUTHORIZATION: a student may only cancel their own booking. Without this
  // check any signed-in user could cancel anyone else's by id.
  const isOwner = booking.userId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return { error: 'That booking does not belong to you.' };
  }

  if (booking.status === 'CANCELLED') {
    return { ok: true, message: 'That booking was already cancelled.' };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() }
  });

  await recordAudit({
    actorUserId: user.id,
    action: 'CANCEL',
    entityType: 'Booking',
    entityId: booking.id,
    entityName: booking.reference,
    details: isAdmin && !isOwner ? 'Cancelled by admin' : 'Cancelled by student'
  });

  revalidatePath('/bookings');
  revalidatePath('/admin/bookings');
  revalidatePath(`/courses/${booking.courseId}`);

  return { ok: true, message: `Cancelled booking ${booking.reference}.` };
}
