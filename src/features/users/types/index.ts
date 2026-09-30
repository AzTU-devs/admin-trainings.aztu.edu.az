import type { Role } from "@shared/constants/roles";

export type UserStatus = "ACTIVE" | "DISABLED" | "PENDING" | "LOCKED";

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
