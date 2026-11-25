import type { PageRequest } from "@shared/types/api";
import type { UUID } from "@shared/types/lms";

/** The two states a sign-up waits in: the account's own `UserStatus`. */
export type AccountApprovalStatus = "PENDING_APPROVAL" | "REJECTED";

/** How the account was made: the website's sign-up form, or a first Google / Apple sign-in. */
export type SignUpMethod = "PASSWORD" | "GOOGLE" | "APPLE";

/**
 * Mirror of a row of `GET /api/super/account-approvals` (`user:approve`,
 * SUPER_ADMIN only); approving and rejecting answer with the row as well.
 * `decidedAt`, `decidedByName` and `rejectionReason` are null until someone
 * has decided (a pending account that was never rejected).
 */
export interface AccountApprovalDto {
  userId: UUID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  signUpMethod: SignUpMethod;
  createdAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
  rejectionReason: string | null;
}

export interface ListAccountApprovalsArgs extends PageRequest {
  status: AccountApprovalStatus;
  /** Free text over name and e-mail, matched by the API across every page. */
  q?: string;
}

/** Body of `POST /api/super/account-approvals/{userId}/reject`. */
export interface RejectAccountRequest {
  reason: string;
}
