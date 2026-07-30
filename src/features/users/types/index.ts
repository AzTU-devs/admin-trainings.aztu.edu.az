import type { Role } from "@shared/constants/roles";

export type UserStatus = "ACTIVE" | "DISABLED" | "PENDING" | "LOCKED";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  password?: string;
}

export type UpdateUserRequest = Partial<CreateUserRequest> & { status?: UserStatus };
