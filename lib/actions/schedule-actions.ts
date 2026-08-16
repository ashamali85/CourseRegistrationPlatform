'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminAction } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getT } from '@/lib/locale';
import { fill } from '@/lib/i18n';
import { courseDaysSchema, daySlotSchema, idSchema, fieldErrors } from '@/lib/validation';
import { dateKeyToUtc, utcToDateKey, todayKey, zonedInputToUtc } from '@/lib/time';
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
 * Copy one day's times onto every other day of the same course. This is the
 * whole point of scheduling a week at once — without it you retype the same
 * three times seven days running.
 *
 * Days that already have times are left alone rather than merged, and any
 * single time that would clash with another course is skipped rather than
 * failing the whole operation.
 */
export async function copyDayTimesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const { d } = await getT();

  const parsed = idSchema(d).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: d.errors.unknownDay };

  const source = await prisma.courseDay.findUnique({
    where: { id: parsed.data.id },
    include: { slots: { orderBy: { startsAt: 'asc' } }, course: true }
  });
  if (!source) return { error: d.errors.dayGone };
  if (source.slots.length === 0) return { error: d.errors.noTimesToCopy };

  const today = todayKey();
  const targets = await prisma.courseDay.findMany({
    where: { courseId: source.courseId, id: { not: source.id } },
    include: { _count: { select: { slots: true } } },
    orderBy: { date: 'asc' }
  });

  // Times of day, as wall-clock strings, taken from the source day.
  const times = source.slots.map((slot) => ({
    time: new Intl.DateTimeFormat('en-GB', {
      timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kuwait',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(slot.startsAt),
    minutes: Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000),
    capacity: slot.capacity,
    note: slot.note
  }));

  let created = 0;
  let skipped = 0;

  for (const target of targets) {
    if (target._count.slots > 0) {
      skipped++;
      continue;
    }
    const dateKey = utcToDateKey(target.date);
    if (dateKey < today) {
      skipped++;
      continue;
    }

    for (const entry of times) {
      const startsAt = zonedInputToUtc(dateKey, entry.time);
      const endsAt = new Date(startsAt.getTime() + entry.minutes * 60000);
      if (startsAt.getTime() < Date.now()) continue;
      if (await findClash(startsAt, endsAt)) continue;

      await prisma.availabilitySlot.create({
        data: {
          courseDayId: target.id,
          startsAt,
          endsAt,
          capacity: entry.capacity,
          note: entry.note
        }
      });
      created++;
    }
  }

  await recordAudit({
    actorUserId: admin.id,
    action: 'COPY_TIMES',
    entityType: 'Course',
    entityId: source.courseId,
    entityName: source.course.title,
    details: `${created} slots created, ${skipped} days skipped`
  });

  revalidatePath(`/admin/courses/${source.courseId}/schedule`);
  revalidatePath(`/courses/${source.courseId}`);

  return { ok: true, message: fill(d.success.timesCopied, { created, skipped }) };
}
