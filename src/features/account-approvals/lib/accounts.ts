import { formatEnum } from "@shared/lib/enums";
import type { AccountApprovalDto, SignUpMethod } from "@features/account-approvals/types";

const METHOD_LABEL: Record<SignUpMethod, string> = {
  PASSWORD: "Email & password",
  GOOGLE: "Google",
  APPLE: "Apple",
};

/** "Email & password", "Google", "Apple" — as the profile page names sign-in methods. */
export function signUpMethodLabel(method: string): string {
  return METHOD_LABEL[method as SignUpMethod] ?? formatEnum(method);
}

/** First and last name, else the e-mail (an OAuth sign-up may arrive without a name). */
export function applicantName(
  a: Pick<AccountApprovalDto, "firstName" | "lastName" | "email">,
): string {
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email;
}

/**
 * The refusals that mean someone else got there first — decided meanwhile
 * (409 ACCOUNT_NOT_PENDING) or the account is gone (404): the dialog closes
 * on them, and the list (refetched either way) shows the account as it is now.
 */
export function isStaleDecision(error: { status?: number; code?: string }): boolean {
  return error.code === "ACCOUNT_NOT_PENDING" || error.status === 404;
}
