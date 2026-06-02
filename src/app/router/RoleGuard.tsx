import { Navigate, Outlet } from "react-router";
import type { Role } from "@shared/constants/roles";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { ROUTES } from "@shared/constants/routes";

interface Props {
  roles: Role[];
  /** Render mode: as a layout route (Outlet) or wrapping children. */
  children?: React.ReactNode;
  /** Where to redirect on missing permission. Default: 403. */
  fallback?: string;
}

/**
 * Gates a route (or subtree) behind one or more roles. The user must hold at
 * least ONE of `roles`. Lacking it, they are redirected to `fallback` (403).
 * Authentication itself is assumed to be enforced upstream by ProtectedRoute.
 */
export function RoleGuard({ roles, children, fallback = ROUTES.unauthorized }: Props) {
  const { has } = usePermissions();
  const allowed = roles.length === 0 || has(...roles);

  if (!allowed) return <Navigate to={fallback} replace />;

  return children ? <>{children}</> : <Outlet />;
}
