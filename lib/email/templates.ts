import { getDictionary, isRtl, type Locale } from '@/lib/i18n';
import type { EmailMessage } from '@/lib/email/send';

/**
 * Emails are built as one small inlined-CSS layout. Mail clients strip
 * stylesheets and ignore most modern CSS, so this deliberately uses tables,
 * inline styles and web-safe fallbacks rather than the app's stylesheet.
 */
const BRAND = '#0a3d91';
const BRAND_2 = '#1b67d5';
const INK = '#10284f';
const INK_SOFT = '#64748b';
const LINE = '#dbe6f5';
const BG = '#eef5fb';

type Row = { label: string; value: string };

function layout(options: {
  locale: Locale;
  title: string;
  intro: string;
  rows?: Row[];
  note?: string;
  action?: { label: string; url: string };
  footer: string;
}): string {
  const rtl = isRtl(options.locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const font = rtl
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Segoe UI', Helvetica, Arial, sans-serif";

  const rows = (options.rows ?? [])
    .map(
      (row) => `
        <tr>
          <td style="padding:7px 0;color:${INK_SOFT};font-size:14px;text-align:${align};white-space:nowrap;">${row.label}</td>
          <td style="padding:7px 0;color:${INK};font-size:14px;font-weight:600;text-align:${align};">${row.value}</td>
        </tr>`
    )
    .join('');

  const action = options.action
    ? `
      <tr><td style="padding:22px 0 4px;text-align:${align};">
        <a href="${options.action.url}"
           style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;
                  font-size:15px;font-weight:700;padding:13px 26px;border-radius:10px;">
          ${options.action.label}
        </a>
      </td></tr>
      <tr><td style="padding:12px 0 0;text-align:${align};color:${INK_SOFT};font-size:12px;line-height:1.7;word-break:break-all;">
        ${options.action.url}
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${options.locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${BG};font-family:${font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${BRAND};background-image:linear-gradient(135deg,${BRAND},${BRAND_2});padding:20px 26px;">
          <span style="color:#ffffff;font-size:17px;font-weight:700;">${getDictionary(options.locale).common.appName}</span>
        </td></tr>
        <tr><td style="padding:26px;" dir="${dir}">
          <h1 style="margin:0 0 10px;font-size:19px;color:${INK};text-align:${align};">${options.title}</h1>
          <p style="margin:0;font-size:15px;line-height:1.75;color:${INK_SOFT};text-align:${align};">${options.intro}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid ${LINE};">${rows}</table>` : ''}
          ${action}
          ${options.note ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:${INK_SOFT};text-align:${align};">${options.note}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 26px;background:#f6f9fc;border-top:1px solid ${LINE};">
          <p style="margin:0;font-size:12px;color:${INK_SOFT};text-align:${align};">${options.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function plain(lines: (string | undefined)[]): string {
  return lines.filter(Boolean).join('\n');
}

// ------------------------------------------------------------------ verify

export function verifyEmailMessage(params: {
  locale: Locale;
  to: string;
  name: string;
  url: string;
}): EmailMessage {
  const d = getDictionary(params.locale);
  const e = d.email.verify;

  return {
    to: params.to,
    subject: e.subject,
    html: layout({
      locale: params.locale,
      title: e.title,
      intro: e.intro.replace('{name}', params.name),
      action: { label: e.button, url: params.url },
      note: e.note,
      footer: d.email.footer
    }),
    text: plain([e.title, '', e.intro.replace('{name}', params.name), '', params.url, '', e.note])
  };
}

// ----------------------------------------------------------------- booking

type BookingFacts = {
  locale: Locale;
  to: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  when: string;
  reference: string;
  url: string;
};

function bookingRows(d: ReturnType<typeof getDictionary>, f: BookingFacts): Row[] {
  return [
    { label: d.common.course, value: f.courseTitle },
    { label: d.common.when, value: f.when },
    { label: d.common.reference, value: f.reference }
  ];
}

/** Receipt for the student who booked. */
export function bookingConfirmedMessage(f: BookingFacts): EmailMessage {
  const d = getDictionary(f.locale);
  const e = d.email.booked;
  return {
    to: f.to,
    subject: e.subject.replace('{course}', f.courseTitle),
    html: layout({
      locale: f.locale,
      title: e.title,
      intro: e.intro.replace('{name}', f.studentName),
      rows: bookingRows(d, f),
      action: { label: e.button, url: f.url },
      note: e.note,
      footer: d.email.footer
    }),
    text: plain([
      e.title,
      '',
      e.intro.replace('{name}', f.studentName),
      '',
      `${d.common.course}: ${f.courseTitle}`,
      `${d.common.when}: ${f.when}`,
      `${d.common.reference}: ${f.reference}`,
      '',
      f.url
    ])
  };
}

/** The same booking, told to the instructor. */
export function bookingForInstructorMessage(f: BookingFacts): EmailMessage {
  const d = getDictionary(f.locale);
  const e = d.email.newBooking;
  return {
    to: f.to,
    subject: e.subject.replace('{course}', f.courseTitle),
    html: layout({
      locale: f.locale,
      title: e.title,
      intro: e.intro,
      rows: [
        ...bookingRows(d, f),
        { label: d.common.student, value: `${f.studentName} (${f.studentEmail})` }
      ],
      action: { label: e.button, url: f.url },
      footer: d.email.footer
    }),
    text: plain([
      e.title,
      '',
      `${d.common.course}: ${f.courseTitle}`,
      `${d.common.when}: ${f.when}`,
      `${d.common.student}: ${f.studentName} (${f.studentEmail})`,
      `${d.common.reference}: ${f.reference}`,
      '',
      f.url
    ])
  };
}

// ------------------------------------------------------------- cancelled

export function bookingCancelledMessage(
  f: BookingFacts & { byAdmin: boolean; forInstructor: boolean }
): EmailMessage {
  const d = getDictionary(f.locale);
  const e = d.email.cancelled;

  const intro = f.forInstructor
    ? f.byAdmin
      ? e.introInstructorByYou
      : e.introInstructorByStudent.replace('{name}', f.studentName)
    : f.byAdmin
      ? e.introStudentByAdmin.replace('{name}', f.studentName)
      : e.introStudentByThem.replace('{name}', f.studentName);

  return {
    to: f.to,
    subject: e.subject.replace('{course}', f.courseTitle),
    html: layout({
      locale: f.locale,
      title: e.title,
      intro,
      rows: [
        ...bookingRows(d, f),
        ...(f.forInstructor
          ? [{ label: d.common.student, value: `${f.studentName} (${f.studentEmail})` }]
          : [])
      ],
      action: { label: e.button, url: f.url },
      note: f.forInstructor ? undefined : e.note,
      footer: d.email.footer
    }),
    text: plain([
      e.title,
      '',
      intro,
      '',
      `${d.common.course}: ${f.courseTitle}`,
      `${d.common.when}: ${f.when}`,
      `${d.common.reference}: ${f.reference}`,
      '',
      f.url
    ])
  };
}
