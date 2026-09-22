/**
 * The API's role codes. USER is the participant role: every self-registered
 * learner has it, and so does every approved expert (whose role set is
 * [USER, TUTOR]). It was missing here, so the dashboard could neither create a
 * participant nor save a participant's or expert's account — the roles enum
 * rejected the USER the API had just returned.
 */
export const ROLES = {
  USER: "USER",
  TUTOR: "TUTOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.USER, ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
export const STAFF_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
