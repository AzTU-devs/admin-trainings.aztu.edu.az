import type { Role } from "@shared/constants/roles";
import type { AuthUser } from "@features/auth/store/authSlice";

export type { AuthUser };

export interface LoginRequest {
  email: string;
  password: string;
}

/** Mirror of backend `PUT /api/auth/me` body. */
export interface UpdateMeRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: string;
}

/* ───────────────── backend DTOs (raw, before unwrapping) ───────────────── */

/** Mirror of backend `UserDto`. */
export interface BackendUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale?: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  roles: string[];
  permissions?: string[];
}

/**
 * Mirror of backend `AuthTokens`. `refreshToken` is part of the response (the public
 * site's BFF reads it from there) but the portal never touches it — the API also sets
 * it as the httpOnly `ep_portal_rt` cookie, which is the portal's only copy.
 */
export interface BackendAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: BackendUserDto;
}

/* ───────────────── frontend-facing (after transform) ───────────────── */

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}

/** Maps a backend UserDto into the app's AuthUser shape. */
export function toAuthUser(dto: BackendUserDto): AuthUser {
  const fullName =
    [dto.firstName, dto.lastName].filter(Boolean).join(" ").trim() || dto.email;
  return {
    id: dto.id,
    email: dto.email,
    fullName,
    roles: dto.roles as Role[],
  };
}
