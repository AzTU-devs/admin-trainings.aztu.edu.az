import { useMemo } from "react";
import { useAppSelector } from "@lib/redux/hooks";
import { ROLES, type Role } from "@shared/constants/roles";

/**
 * RBAC helper. `has(...roles)` returns true if the user has ANY of the given roles.
 * `hasAll(...roles)` requires ALL.
 */
const NO_ROLES: Role[] = [];

export function usePermissions() {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? NO_ROLES);
  const permissions = useAppSelector((s) => s.auth.user?.permissions);

  return useMemo(() => {
    const set = new Set<Role>(roles);
    const perms = permissions ? new Set(permissions) : null;
    const has = (...required: Role[]) => required.some((r) => set.has(r));
    const hasAll = (...required: Role[]) => required.every((r) => set.has(r));
    /**
     * Whether the API grants this permission. Unknown (a session from before
     * permissions were stored) counts as yes: the API still enforces it, and
     * hiding a feature on a guess would be worse than one refused call.
     */
    const can = (permission: string) => (perms ? perms.has(permission) : true);
    return {
      roles,
      permissions,
      has,
      hasAll,
      can,
      isTutor: set.has(ROLES.TUTOR),
      isAdmin: set.has(ROLES.ADMIN),
      isSuperAdmin: set.has(ROLES.SUPER_ADMIN),
      isStaff: set.has(ROLES.ADMIN) || set.has(ROLES.SUPER_ADMIN),
    };
  }, [roles, permissions]);
}
