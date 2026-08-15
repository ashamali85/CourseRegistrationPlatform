import { z } from 'zod';

/**
 * Every server action validates its input through one of these. Lengths are
 * capped so a crafted request cannot push megabytes into the database.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Enter a valid email address.')
  .max(160, 'That email address is too long.')
  .email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'That password is too long.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'That name is too long.'),
  email: emailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email address.').max(160),
  password: z.string().min(1, 'Enter your password.').max(200)
});

export const courseSchema = z.object({
  title: z.string().trim().min(3, 'Give the course a title.').max(120),
  summary: z.string().trim().max(200, 'Keep the summary under 200 characters.').default(''),
  description: z.string().trim().max(4000).default(''),
  durationMinutes: z.coerce
    .number()
    .int('Duration must be a whole number of minutes.')
    .min(15, 'Minimum duration is 15 minutes.')
    .max(480, 'Maximum duration is 8 hours.'),
  isPublished: z.coerce.boolean().default(false)
});

export const courseIdSchema = z.object({
  courseId: z.string().trim().cuid('Unknown course.')
});

export const slotSchema = z
  .object({
    // datetime-local sends "YYYY-MM-DDTHH:mm" with no zone.
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Pick a start time.'),
    endTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Pick an end time.'),
    capacity: z.coerce
      .number()
      .int()
      .min(1, 'Capacity must be at least 1.')
      .max(100, 'Capacity cannot exceed 100.'),
    note: z.string().trim().max(200).default(''),
    // '' means "open to any published course"
    courseId: z.string().trim().max(40).default('')
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'The end time must be after the start time.',
    path: ['endTime']
  });

export const bookSlotSchema = z.object({
  slotId: z.string().trim().cuid('Unknown time slot.'),
  courseId: z.string().trim().cuid('Unknown course.'),
  notes: z.string().trim().max(500, 'Keep your note under 500 characters.').default('')
});

export const idSchema = z.object({
  id: z.string().trim().cuid('Unknown record.')
});

/** Turn a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = issue.message;
  }
  return out;
}
