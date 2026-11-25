import { env } from "@shared/config/env";
import { formatDayMonth, formatWeekdayDate } from "@shared/lib/weekdays";
import { isInPerson, type UUID } from "@shared/types/lms";
import { PLATFORM_TIME_ZONE, zonedDate } from "@features/calendar/lib/calendarEvents";
import type {
  CertificateRef,
  CertificateTutor,
  CourseGraduationView,
  GraduationStudent,
} from "@features/certificates/types";

/*
 * Wording and rules of ending a course and its certificates. The rules are
 * the API's; they are repeated here only to say things before a request is
 * refused (an expert ending an in-person course before its last day).
 */

/** The language the certificate links open in: the university's own. */
const CERTIFICATE_LANG = "az";

/**
 * A certificate code as it is printed: `AZTU-XXXX-XXXX-XXXX`. The API may
 * send the bare 12 characters or the printed form; anything else is shown as
 * it came, rather than guessed at.
 */
export function formatCertificateCode(code: string): string {
  const bare = code.replace(/[^0-9a-z]/gi, "").toUpperCase();
  const body = bare.length === 16 && bare.startsWith("AZTU") ? bare.slice(4) : bare;
  if (!/^[0-9A-Z]{12}$/.test(body)) return code;
  return `AZTU-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

/** The certificate's public page on the website, where anyone can verify it. */
export function certificatePageUrl(code: string): string {
  return `${env.site.url}/${CERTIFICATE_LANG}/certificates/${encodeURIComponent(code)}`;
}

/** The certificate as a PDF, from the website (a revoked one has none: 410). */
export function certificatePdfUrl(code: string): string {
  return `${certificatePageUrl(code)}/pdf`;
}

export function isLive(certificate: CertificateRef | null | undefined): certificate is CertificateRef {
  return !!certificate && !certificate.revokedAt;
}

/**
 * The students who may still be graduated: those without a live certificate
 * (never graduated, or their certificate was revoked). In the view's order.
 */
export function graduatable(view: Pick<CourseGraduationView, "students">): GraduationStudent[] {
  return view.students.filter((s) => !isLive(s.certificate));
}

/** Whether a course page has a Certificates section: ended, or with certificates from before a reopening. */
export function hasCertificatesSection(view: CourseGraduationView | undefined): view is CourseGraduationView {
  return !!view && (!!view.endedAt || view.students.some((s) => !!s.certificate));
}

/** How many certificates are valid and how many revoked, over the students listed. */
export function certificateCounts(view: Pick<CourseGraduationView, "students">): { valid: number; revoked: number } {
  let valid = 0;
  let revoked = 0;
  for (const s of view.students) {
    if (!s.certificate) continue;
    if (s.certificate.revokedAt) revoked += 1;
    else valid += 1;
  }
  return { valid, revoked };
}

/** "12 of 14 will graduate and receive a certificate". */
export function graduateCountLabel(selected: number, total: number): string {
  if (selected === 0) return `None of ${total} selected: no one graduates now. They can be graduated later.`;
  return `${selected} of ${total} will graduate and receive a certificate`;
}

/** An instant as its Baku date, written out: "Tue 24 Nov 2026". */
export function formatBakuDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatWeekdayDate(zonedDate(d, PLATFORM_TIME_ZONE));
}

/** An instant as its Baku date without the weekday, for a list: "24 Nov 2026". */
export function formatBakuDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDayMonth(zonedDate(d, PLATFORM_TIME_ZONE), true);
}

/** "Ended on Tue 24 Nov 2026 by Leyla Məmmədova" (without "by" when the API names no one). */
export function endedLine(view: Pick<CourseGraduationView, "endedAt" | "endedByName">): string {
  if (!view.endedAt) return "";
  const by = view.endedByName?.trim();
  return `Ended on ${formatBakuDate(view.endedAt)}${by ? ` by ${by}` : ""}`;
}

/**
 * An in-person course before its last day (Baku): only the super admin may
 * end it then (the API answers COURSE_NOT_OVER to an expert). An online
 * course, or one without an end date, can be ended any time.
 */
export function beforeLastDay(view: Pick<CourseGraduationView, "courseType" | "endDate">, today: string): boolean {
  return isInPerson(view.courseType) && !!view.endDate && today < view.endDate;
}

/** The name a student is listed by: first and last name, else the email. */
export function graduateName(s: Pick<GraduationStudent, "firstName" | "lastName" | "email">): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.email;
}

/**
 * The experts who may be named on a course's certificates — its editor and
 * its roster — editor first, each once. The editor is added from the course
 * itself should the roster leave them out.
 */
export function courseExperts(course: {
  tutorId?: UUID | null;
  tutorDisplayName?: string | null;
  tutors?: ReadonlyArray<{ tutorId: UUID; displayName?: string | null; authorized?: boolean }> | null;
}): CertificateTutor[] {
  const out = new Map<UUID, CertificateTutor>();
  if (course.tutorId) {
    const listed = course.tutors?.find((t) => t.tutorId === course.tutorId);
    out.set(course.tutorId, { tutorId: course.tutorId, displayName: listed?.displayName || course.tutorDisplayName || "" });
  }
  for (const t of course.tutors ?? []) {
    if (!out.has(t.tutorId)) out.set(t.tutorId, { tutorId: t.tutorId, displayName: t.displayName || "" });
  }
  return [...out.values()];
}
