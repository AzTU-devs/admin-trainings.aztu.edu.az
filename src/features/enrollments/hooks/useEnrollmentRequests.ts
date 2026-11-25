import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useListEnrollmentRequestsQuery } from "@features/enrollments/api/enrollmentRequestsApi";

/**
 * `enrollment:approve` — granted to TUTOR and SUPER_ADMIN. An expert holding
 * it decides only on the courses they own (the API leaves the others out of
 * their list and answers 403 to a decision), and only while their own
 * approval as an expert stands (otherwise the list itself is a 403).
 */
export function useCanApproveEnrollments(): boolean {
  const { can, isTutor, isSuperAdmin } = usePermissions();
  return can("enrollment:approve", isTutor || isSuperAdmin);
}

/**
 * How many enrolment requests wait for the viewer's decision, for the menu
 * and the Requests tab; undefined for anyone who may not decide, or whom the
 * API refuses (nothing to show then).
 *
 * The page total of a one-row page: the API has no count endpoint. Requests
 * arrive while the dashboard is open, so it is asked again every minute while
 * the window is focused, and when the window is focused again.
 */
export function usePendingEnrollmentRequestCount(): number | undefined {
  const allowed = useCanApproveEnrollments();
  const { data, isError } = useListEnrollmentRequestsQuery(
    { status: "PENDING_APPROVAL", page: 0, size: 1 },
    { skip: !allowed, pollingInterval: 60_000, skipPollingIfUnfocused: true, refetchOnFocus: true },
  );
  return allowed && !isError ? data?.totalElements : undefined;
}
