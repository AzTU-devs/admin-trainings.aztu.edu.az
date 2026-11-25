import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useListAccountApprovalsQuery } from "@features/account-approvals/api/accountApprovalsApi";

/**
 * How many sign-ups wait for approval, for the menu item and the Pending tab;
 * undefined for anyone without `user:approve` (nothing is asked for then).
 *
 * The page total of a one-row page: the API has no count endpoint. Sign-ups
 * arrive while the dashboard is open, so it is asked again every minute while
 * the window is focused, and when the window is focused again.
 */
export function usePendingAccountCount(): number | undefined {
  const { can, isSuperAdmin } = usePermissions();
  const allowed = can("user:approve", isSuperAdmin);
  const { data, isError } = useListAccountApprovalsQuery(
    { status: "PENDING_APPROVAL", page: 0, size: 1 },
    { skip: !allowed, pollingInterval: 60_000, skipPollingIfUnfocused: true, refetchOnFocus: true },
  );
  return allowed && !isError ? data?.totalElements : undefined;
}
