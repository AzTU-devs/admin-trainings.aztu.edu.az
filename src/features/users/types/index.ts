import type { Role } from "@shared/constants/roles";

/**
 * ACTIVE, DISABLED (the API's SUSPENDED), or LOCKED while a failed-login lockout
 * runs (see `lockedUntil`). PENDING is kept so any other value still renders.
 */
export type UserStatus = "ACTIVE" | "DISABLED" | "PENDING" | "LOCKED";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  /** When a temporary failed-login lockout ends; null when not locked out. */
  lockedUntil?: string | null;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  password?: string;
}

export type UpdateUserRequest = Partial<CreateUserRequest> & { status?: UserStatus };
