import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n';
import { WORK_DAY_START_HOUR, WORK_DAY_END_HOUR } from '@/lib/time';

/**
 * Every server action validates its input through one of these. Schemas are
 * built per-request from the caller's dictionary so validation errors come back
 * in the user's own language. Lengths are capped so a crafted request cannot
 * push megabytes into the database.
 */

export const PASSWORD_MIN = 8;

export function emailSchema(d: Dictionary) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(5, d.validation.enterValidEmail)
    .max(160, d.validation.emailTooLong)
    .email(d.validation.enterValidEmail);
}

export function passwordSchema(d: Dictionary) {
  return z
    .string()
    .min(PASSWORD_MIN, d.validation.passwordMin)
    .max(200, d.validation.passwordTooLong);
}

export function registerSchema(d: Dictionary) {
  return z.object({
    name: z.string().trim().min(2, d.validation.enterName).max(80, d.validation.nameTooLong),
    email: emailSchema(d),
    password: passwordSchema(d)
  });
}

export function loginSchema(d: Dictionary) {
  return z.object({
    email: z.string().trim().toLowerCase().min(1, d.validation.enterEmail).max(160),
    password: z.string().min(1, d.validation.enterPassword).max(200)
  });
}

export function changePasswordSchema(d: Dictionary) {
  return z
    .object({
      currentPassword: z.string().min(1, d.validation.enterCurrentPassword).max(200),
      newPassword: passwordSchema(d),
      confirmPassword: z.string().min(1, d.validation.repeatNewPassword).max(200)
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: d.validation.passwordsDoNotMatch,
      path: ['confirmPassword']
    })
    .refine((v) => v.newPassword !== v.currentPassword, {
      message: d.validation.differentPassword,
      path: ['newPassword']
    });
}

export function courseSchema(d: Dictionary) {
  return z.object({
    title: z.string().trim().min(3, d.validation.courseTitleRequired).max(120),
    summary: z.string().trim().max(200, d.validation.summaryTooLong).default(''),
    description: z.string().trim().max(4000, d.validation.tooLong).default(''),
    // Only 1, 2 or 3 hours are allowed. A plain min/max would let 2.5 through.
    sessionHours: z.coerce
      .number()
      .int(d.validation.sessionHoursInvalid)
      .refine((v) => v === 1 || v === 2 || v === 3, d.validation.sessionHoursInvalid),
    isPublished: z.coerce.boolean().default(false)
  });
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The schedule calendar posts its selection as a comma-separated list of date
 * keys. Capped at 366 so one request cannot create thousands of rows.
 */
export function courseDaysSchema(d: Dictionary) {
  return z.object({
    courseId: z.string().trim().cuid(d.errors.unknownCourse),
    dates: z
      .string()
      .trim()
      .transform((v) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []))
      .pipe(
        z
          .array(z.string().regex(DATE_KEY, d.validation.pickDate))
          .max(366, d.validation.tooManyDays)
      )
  });
}

export function daySlotSchema(d: Dictionary) {
  return z
    .object({
      courseDayId: z.string().trim().cuid(d.errors.unknownDay),
      startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, d.validation.pickStart),
      sessionHours: z.coerce
        .number()
        .int(d.validation.sessionHoursInvalid)
        .refine((v) => v === 1 || v === 2 || v === 3, d.validation.sessionHoursInvalid),
      capacity: z.coerce
        .number()
        .int()
        .min(1, d.validation.capacityMin)
        .max(100, d.validation.capacityMax),
      note: z.string().trim().max(200, d.validation.tooLong).default('')
    })
    // The grid only offers valid cells, but a server action is reachable
    // directly, so the working window is enforced here too.
    .refine(
      (v) => {
        const hour = Number.parseInt(v.startTime.slice(0, 2), 10);
        return hour >= WORK_DAY_START_HOUR && hour < WORK_DAY_END_HOUR;
      },
      { message: d.validation.outsideWorkingHours, path: ['startTime'] }
    )
    .refine(
      (v) => {
        const hour = Number.parseInt(v.startTime.slice(0, 2), 10);
        return hour + v.sessionHours <= WORK_DAY_END_HOUR;
      },
      { message: d.validation.sessionExceedsDay, path: ['sessionHours'] }
    );
}

export function bookSlotSchema(d: Dictionary) {
  return z.object({
    slotId: z.string().trim().cuid(d.errors.unknownSlot),
    courseId: z.string().trim().cuid(d.errors.unknownCourse),
    notes: z.string().trim().max(500, d.validation.notesTooLong).default('')
  });
}

export function idSchema(d: Dictionary) {
  return z.object({
    id: z.string().trim().cuid(d.errors.unknownRecord)
  });
}

/** Turn a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = issue.message;
  }
  return out;
}
