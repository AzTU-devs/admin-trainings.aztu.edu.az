import { useMemo } from "react";
import { useAppSelector } from "@lib/redux/hooks";
import { ROLES, type Role } from "@shared/constants/roles";

/**
 * RBAC helper. `has(...roles)` returns true if the user has ANY of the given roles.
 * `hasAll(...roles)` requires ALL.
 */
export function usePermissions() {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  return useMemo(() => {
    const set = new Set<Role>(roles);
    const has = (...required: Role[]) => required.some((r) => set.has(r));
    const hasAll = (...required: Role[]) => required.every((r) => set.has(r));
    return {
      roles,
      has,
      hasAll,
      isTutor: set.has(ROLES.TUTOR),
      isAdmin: set.has(ROLES.ADMIN),
      isSuperAdmin: set.has(ROLES.SUPER_ADMIN),
      isStaff: set.has(ROLES.ADMIN) || set.has(ROLES.SUPER_ADMIN),
    };
  }, [roles]);
}
