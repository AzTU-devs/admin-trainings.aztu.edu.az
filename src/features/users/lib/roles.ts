import { ROLES } from "@shared/constants/roles";
import { formatEnum } from "@shared/lib/enums";
import type { AccountRole } from "@features/users/types";

/**
 * USER is the participant (İştirakçi) role: every account made on the public
 * website holds it. It is not a dashboard role, so the Users page never offers
 * it for a new account (ALL_ROLES leaves it out), but participants are listed
 * there like everyone else and an account that holds it keeps it when edited.
 */
export const PARTICIPANT_ROLE = "USER" as const;

const ROLE_LABEL: Record<AccountRole, string> = {
  [PARTICIPANT_ROLE]: "İştirakçi",
  [ROLES.TUTOR]: "Tutor",
  [ROLES.ADMIN]: "Admin",
  [ROLES.SUPER_ADMIN]: "Super admin",
};

/** A role code as the dashboard names it ("SUPER_ADMIN" → "Super admin", "USER" → "İştirakçi"). */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role as AccountRole] ?? formatEnum(role);
}

/** The Users page's role filter: every account ("ALL"), or those holding one role. */
export const ROLE_FILTERS: ReadonlyArray<{ value: AccountRole; label: string }> = [
  { value: PARTICIPANT_ROLE, label: "İştirakçilər" },
  { value: ROLES.TUTOR, label: "Tutors" },
  { value: ROLES.ADMIN, label: "Admins" },
  { value: ROLES.SUPER_ADMIN, label: "Super admins" },
];
