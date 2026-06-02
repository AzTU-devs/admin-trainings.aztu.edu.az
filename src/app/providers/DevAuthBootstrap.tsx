import { useEffect } from "react";
import { env } from "@shared/config/env";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { authSuccess } from "@features/auth/store/authSlice";
import { ROLES } from "@shared/constants/roles";

/**
 * DEV ONLY. When VITE_AUTH_BYPASS=true, injects a synthetic super-user into the
 * Redux auth slice so role-aware UI (sidebar, RoleGuard, useAuth) works without
 * a real backend. No-op in production builds.
 */
export function DevAuthBootstrap() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (!env.app.isDev || !env.auth.bypass) return;
    if (user) return;
    dispatch(
      authSuccess({
        user: {
          id: "dev",
          email: "dev@aztu.edu.az",
          fullName: "AzTU Developer",
          roles: [ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
        },
        accessToken: "dev.bypass.token",
      }),
    );
  }, [dispatch, user]);

  return null;
}
