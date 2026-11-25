import type { Role } from "@shared/constants/roles";

/**
 * The Users table's vocabulary for an account's state. PENDING_APPROVAL is a
 * new İştirakçi sign-up waiting for a super admin, REJECTED one they turned
 * down: neither can sign in, and neither is switched on or off from here —
 * they are decided on the Account approvals page.
 */
export type UserStatus = "ACTIVE" | "DISABLED" | "PENDING" | "LOCKED" | "PENDING_APPROVAL" | "REJECTED";

/** A sign-up still waiting for (or refused) approval, rather than an account to enable or disable. */
export function awaitsApproval(status: UserStatus | string): boolean {
  return status === "PENDING_APPROVAL" || status === "REJECTED";
}

/**
 * A role code as the API sends it: the dashboard roles plus USER, the
 * participant (İştirakçi) role every website account holds.
 */
export type AccountRole = Role | "USER";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: AccountRole[];
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  phone?: string;
  roles: AccountRole[];
  password?: string;
}

export type UpdateUserRequest = Partial<CreateUserRequest> & { status?: UserStatus };
