'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';
import { courseDaysSchema, daySlotSchema, idSchema, fieldErrors } from '@/lib/validation';
import { dateKeyToUtc, utcToDateKey, todayKey, zonedInputToUtc } from '@/lib/time';
import { APP_TIMEZONE } from '@/lib/env';
import { formatDateKey, formatTime } from '@/lib/format';

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * There is one instructor, so a new slot must not overlap ANY existing slot,
 * including ones belonging to other courses. Without this, two courses could
 * both be scheduled for 10:00 on the same Tuesday.
 */
async function findClash(
  startsAt: Date,
  endsAt: Date,
  ignoreSlotId?: string
) {
  return prisma.availabilitySlot.findFirst({
    where: {
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(ignoreSlotId ? { id: { not: ignoreSlotId } } : {})
    },
    include: { courseDay: { include: { course: { select: { title: true } } } } }
  });
}

// ------------------------------------------------------------------ the days

/**
 * Replace a course's set of dates with exactly the selection posted. Days that
 * disappear are deleted along with their slots — but never if a student has a
 * confirmed booking on one, because that would silently cancel their session.
 */
export async function setCourseDaysAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const parsed = courseDaysSchema(d).safeParse({
    courseId: formData.get('courseId'),
    dates: formData.get('dates') ?? ''
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { courseId, dates } = parsed.data;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: d.errors.courseGone };

  const today = todayKey();
  const wanted = [...new Set(dates)].filter((key) => key >= today).sort();

  const existing = await prisma.courseDay.findMany({
    where: { courseId },
    include: {
      _count: { select: { slots: true } },
      slots: {
        select: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } }
      }
    }
  });

  const existingKeys = new Set(existing.map((day) => utcToDateKey(day.date)));
  const toAdd = wanted.filter((key) => !existingKeys.has(key));
  const toRemove = existing.filter((day) => !wanted.includes(utcToDateKey(day.date)));

  const blocked = toRemove.filter((day) =>
    day.slots.some((slot) => slot._count.bookings > 0)
  );
  if (blocked.length > 0) {
    return {
      error: fill(d.errors.dayHasBookings, {
        days: blocked.map((day) => formatDateKey(day.date, locale)).join('، ')
      })
    };
  }

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.courseDay.deleteMany({ where: { id: { in: toRemove.map((x) => x.id) } } })]
      : []),
    ...(toAdd.length
      ? [
          prisma.courseDay.createMany({
            data: toAdd.map((key) => ({ courseId, date: dateKeyToUtc(key) })),
            skipDuplicates: true
          })
        ]
      : [])
  ]);

  await recordAudit({
    actorUserId: admin.id,
    action: 'SET_SCHEDULE',
    entityType: 'Course',
    entityId: course.id,
    entityName: course.title,
    details: `+${toAdd.length} / -${toRemove.length} days`
  });

  revalidatePath(`/admin/courses/${courseId}/schedule`);
  revalidatePath('/admin/availability');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/courses');

  return {
    ok: true,
    message: fill(d.success.scheduleSaved, {
      added: toAdd.length,
      removed: toRemove.length,
      total: wanted.length
    })
  };
}

// ----------------------------------------------------------------- the times

export async function addDaySlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const parsed = daySlotSchema(d).safeParse({
    courseDayId: formData.get('courseDayId'),
    startTime: formData.get('startTime'),
    sessionHours: formData.get('sessionHours'),
    capacity: formData.get('capacity'),
    note: formData.get('note') ?? ''
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { courseDayId, startTime, sessionHours, capacity, note } = parsed.data;

  const day = await prisma.courseDay.findUnique({
    where: { id: courseDayId },
    include: { course: true }
  });
  if (!day) return { error: d.errors.dayGone };

  const dateKey = utcToDateKey(day.date);
  const startsAt = zonedInputToUtc(dateKey, startTime);
  const endsAt = new Date(startsAt.getTime() + sessionHours * 60 * 60 * 1000);

  if (startsAt.getTime() < Date.now()) {
    return { fieldErrors: { startTime: d.errors.slotInPast } };
  }

  const clash = await findClash(startsAt, endsAt);
  if (clash) {
    return {
      error: fill(d.errors.slotOverlapCourse, {
        course: clash.courseDay.course.title,
        when: formatTime(clash.startsAt, locale)
      })
    };
  }

  const slot = await prisma.availabilitySlot.create({
    data: { courseDayId, startsAt, endsAt, capacity, note }
  });

  await recordAudit({
    actorUserId: admin.id,
    action: 'CREATE',
    entityType: 'AvailabilitySlot',
    entityId: slot.id,
    entityName: `${dateKey} ${startTime}`,
    details: day.course.title
  });

  revalidatePath(`/admin/courses/${day.courseId}/schedule`);
  revalidatePath(`/courses/${day.courseId}`);

  return { ok: true, message: fill(d.success.slotAdded, { when: formatTime(startsAt, locale) }) };
}

export async function deleteDaySlotAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { locale, d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownSlot };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: parsed.data.id },
    include: {
      courseDay: true,
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }
    }
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
    entityName: formatTime(slot.startsAt, locale)
  });

  revalidatePath(`/admin/courses/${slot.courseDay.courseId}/schedule`);
  revalidatePath(`/courses/${slot.courseDay.courseId}`);

  return { ok: true, message: d.success.slotRemoved };
}

/**
 * Copy ONE session forward onto every later day of the same course.
 *
 * Triggered from the last booked block of a given hour, so the mental model is
 * "extend this time across the days that follow" rather than "sync two days".
 *
 * A later day is skipped, not fatal, when the time is already taken — by this
 * course or any other — so one conflict does not abandon the rest.
 */
export async function copySlotForwardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownSlot };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: parsed.data.id },
    include: { courseDay: { include: { course: true } } }
  });
  if (!slot) return { error: d.errors.slotGone };

  const minutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000);

  // The wall-clock start time, so every copy lands at the same local hour.
  const startTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(slot.startsAt);

  const laterDays = await prisma.courseDay.findMany({
    where: {
      courseId: slot.courseDay.courseId,
      date: { gt: slot.courseDay.date }
    },
    orderBy: { date: 'asc' }
  });

  let created = 0;
  let skipped = 0;

  for (const day of laterDays) {
    const dateKey = utcToDateKey(day.date);
    const startsAt = zonedInputToUtc(dateKey, startTime);
    const endsAt = new Date(startsAt.getTime() + minutes * 60000);

    if (startsAt.getTime() < Date.now()) {
      skipped++;
      continue;
    }
    // findClash spans every course, so this also catches a session this course
    // already has at that hour.
    if (await findClash(startsAt, endsAt)) {
      skipped++;
      continue;
    }

    await prisma.availabilitySlot.create({
      data: {
        courseDayId: day.id,
        startsAt,
        endsAt,
        capacity: slot.capacity,
        note: slot.note
      }
    });
    created++;
  }

  await recordAudit({
    actorUserId: admin.id,
    action: 'COPY_FORWARD',
    entityType: 'Course',
    entityId: slot.courseDay.courseId,
    entityName: slot.courseDay.course.title,
    details: `${startTime} -> ${created} later day(s), ${skipped} skipped`
  });

  revalidatePath(`/admin/courses/${slot.courseDay.courseId}/schedule`);
  revalidatePath(`/courses/${slot.courseDay.courseId}`);

  return { ok: true, message: fill(d.success.copiedForward, { created, skipped }) };
}
