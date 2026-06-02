export const ROLES = {
  TUTOR: "TUTOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
export const STAFF_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
