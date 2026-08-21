'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUserAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { bookSlotSchema, idSchema, fieldErrors } from '@/lib/validation';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';
import { sendEmailSafely, instructorEmail, appUrl } from '@/lib/email/send';
import {
  bookingConfirmedMessage,
  bookingForInstructorMessage,
  bookingCancelledMessage
} from '@/lib/email/templates';
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
  const { locale, d } = await getT();

  // Checked here, not only in the UI: a server action is reachable directly,
  // and an unconfirmed address means the confirmation email goes nowhere.
  if (!user.emailVerified) return { error: d.verify.mustVerifyToBook };

  const parsed = bookSlotSchema(d).safeParse({
    slotId: formData.get('slotId'),
    courseId: formData.get('courseId'),
    notes: formData.get('notes') ?? ''
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { slotId, courseId, notes } = parsed.data;

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        // A slot reaches its course through its day, so the day is needed to
        // verify ownership below.
        const slot = await tx.availabilitySlot.findUnique({
          where: { id: slotId },
          include: { courseDay: true }
        });
        if (!slot) throw new BookingError(d.errors.slotUnavailable);
        if (slot.startsAt.getTime() <= Date.now()) {
          throw new BookingError(d.errors.slotStarted);
        }

        const course = await tx.course.findUnique({ where: { id: courseId } });
        // Students must never be able to book an unpublished course by guessing
        // its id, even though it never appears in their course list.
        if (!course || !course.isPublished) {
          throw new BookingError(d.errors.courseNotOpen);
        }
        // Every slot now belongs to exactly one course. slotId and courseId
        // arrive as separate form fields, so without this a student could pair
        // one course's slot with another course's id.
        if (slot.courseDay.courseId !== course.id) {
          throw new BookingError(d.errors.slotReservedOther);
        }

        // If this student cancelled here before, reinstate rather than insert —
        // the (slotId, userId) unique index would otherwise reject them.
        const existing = await tx.booking.findUnique({
          where: { slotId_userId: { slotId, userId: user.id } }
        });
        if (existing && existing.status === 'CONFIRMED') {
          throw new BookingError(d.errors.alreadyBooked);
        }

        const taken = await tx.booking.count({
          where: { slotId, status: 'CONFIRMED' }
        });
        if (taken >= slot.capacity) {
          throw new BookingError(d.errors.slotFull);
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
      details: `${booking.course.title} @ ${formatDateTime(booking.slot.startsAt, locale)}`
    });

    const facts = {
      locale,
      studentName: user.name,
      studentEmail: user.email,
      courseTitle: booking.course.title,
      when: formatDateTime(booking.slot.startsAt, locale),
      reference: booking.reference
    };

    await sendEmailSafely(
      bookingConfirmedMessage({ ...facts, to: user.email, url: `${appUrl()}/bookings` })
    );

    const instructor = instructorEmail();
    if (instructor) {
      await sendEmailSafely(
        bookingForInstructorMessage({
          ...facts,
          to: instructor,
          url: `${appUrl()}/admin/bookings`
        })
      );
    }

    revalidatePath('/bookings');
    revalidatePath(`/courses/${courseId}`);
    revalidatePath('/admin/bookings');

    return {
      ok: true,
      message: fill(d.success.booked, {
        course: booking.course.title,
        when: formatDateTime(booking.slot.startsAt, locale),
        ref: booking.reference
      })
    };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 unique violation, P2034 serialization failure — both mean someone
      // else won the race for this seat.
      if (error.code === 'P2002' || error.code === 'P2034') {
        return { error: d.errors.slotFull };
      }
    }

    console.error('booking failed', error);
    return { error: d.errors.bookingFailed };
  }
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUserAction();
  const { locale, d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownBooking };

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.id },
    include: { course: true, slot: true }
  });
  if (!booking) return { error: d.errors.bookingGone };

  // AUTHORIZATION: a student may only cancel their own booking. Without this
  // check any signed-in user could cancel anyone else's by id.
  const isOwner = booking.userId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return { error: d.errors.notYourBooking };
  }

  if (booking.status === 'CANCELLED') {
    return { ok: true, message: d.success.alreadyCancelled };
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

  // The student who holds the booking is not necessarily the person cancelling
  // it, so their details come from the booking rather than from the session.
  const student = await prisma.user.findUnique({ where: { id: booking.userId } });
  const byAdmin = isAdmin && !isOwner;

  const facts = {
    locale,
    studentName: student?.name ?? '',
    studentEmail: student?.email ?? '',
    courseTitle: booking.course.title,
    when: formatDateTime(booking.slot.startsAt, locale),
    reference: booking.reference
  };

  if (student?.email) {
    await sendEmailSafely(
      bookingCancelledMessage({
        ...facts,
        to: student.email,
        url: `${appUrl()}/bookings`,
        byAdmin,
        forInstructor: false
      })
    );
  }

  const instructor = instructorEmail();
  if (instructor) {
    await sendEmailSafely(
      bookingCancelledMessage({
        ...facts,
        to: instructor,
        url: `${appUrl()}/admin/bookings`,
        byAdmin,
        forInstructor: true
      })
    );
  }

  revalidatePath('/bookings');
  revalidatePath('/admin/bookings');
  revalidatePath(`/courses/${booking.courseId}`);

  return { ok: true, message: fill(d.success.bookingCancelled, { ref: booking.reference }) };
}
