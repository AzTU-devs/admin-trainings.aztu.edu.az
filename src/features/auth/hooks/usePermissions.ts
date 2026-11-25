import { useMemo } from "react";
import { useAppSelector } from "@lib/redux/hooks";
import { ROLES, type Role } from "@shared/constants/roles";

/**
 * RBAC helper. `has(...roles)` returns true if the user has ANY of the given roles.
 * `hasAll(...roles)` requires ALL.
 */
export function usePermissions() {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);
  const permissions = useAppSelector((s) => s.auth.user?.permissions);

  return useMemo(() => {
    const set = new Set<Role>(roles);
    const has = (...required: Role[]) => required.some((r) => set.has(r));
    const hasAll = (...required: Role[]) => required.every((r) => set.has(r));
    /**
     * Whether the user holds `permission`, by the list `GET /auth/me` sent;
     * `fallback` (the role the permission belongs to) when no list was sent.
     */
    const can = (permission: string, fallback: boolean) =>
      permissions ? permissions.includes(permission) : fallback;
    return {
      roles,
      has,
      hasAll,
      can,
      isTutor: set.has(ROLES.TUTOR),
      isAdmin: set.has(ROLES.ADMIN),
      isSuperAdmin: set.has(ROLES.SUPER_ADMIN),
      isStaff: set.has(ROLES.ADMIN) || set.has(ROLES.SUPER_ADMIN),
      /** `course:delete`, granted to the super admin only. */
      canDeleteCourse: can("course:delete", set.has(ROLES.SUPER_ADMIN)),
      /**
       * `certificate:manage`, the super admin's: the names printed on a
       * course's certificates, revoking one, reopening an ended course.
       */
      canManageCertificates: can("certificate:manage", set.has(ROLES.SUPER_ADMIN)),
    };
  }, [roles, permissions]);
}
