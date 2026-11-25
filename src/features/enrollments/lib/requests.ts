import { formatMoney } from "@features/user-profile/lib/format";
import type { EnrollmentRequestDto } from "@features/enrollments/types";

/** The student's name, else their e-mail. */
export function studentName(
  r: Pick<EnrollmentRequestDto, "firstName" | "lastName" | "email">,
): string {
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.email;
}

/** The first name alone, for the sentences of a dialog ("Leyla joins the course"). */
export function firstNameOf(
  r: Pick<EnrollmentRequestDto, "firstName" | "lastName" | "email">,
): string {
  return r.firstName?.trim() || studentName(r);
}

/** "3 seats left", "1 seat left", "Full"; an online course (null) has no seat limit. */
export function seatsLeftText(seatsLeft: number | null | undefined): string {
  if (seatsLeft === null || seatsLeft === undefined) return "No seat limit";
  if (seatsLeft <= 0) return "Full";
  return `${seatsLeft.toLocaleString()} seat${seatsLeft === 1 ? "" : "s"} left`;
}

/** "Free", or the price with its currency ("50 AZN"). */
export function priceText(r: Pick<EnrollmentRequestDto, "paid" | "price" | "currency">): string {
  return r.paid ? formatMoney(r.price, r.currency) : "Free";
}

/**
 * Refusals that mean the request is no longer there to decide: decided or
 * cancelled meanwhile (409 ENROLLMENT_NOT_PENDING), its course ended (409
 * COURSE_ENDED — ending rejects the pending ones) or deleted (404). The
 * dialog closes on them; the list, refetched either way, shows what is left.
 */
export function isGoneRequest(error: { status?: number; code?: string }): boolean {
  return (
    error.code === "ENROLLMENT_NOT_PENDING" || error.code === "COURSE_ENDED" || error.status === 404
  );
}
