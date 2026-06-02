import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@features/auth/hooks/useAuth";
import { ROUTES } from "@shared/constants/routes";

interface Props {
  /** Where to send unauthenticated users. Defaults to /sign-in. */
  redirectTo?: string;
}

export function ProtectedRoute({ redirectTo = ROUTES.signIn }: Props) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  // Still resolving the session (e.g. refreshing the token) — render nothing
  // rather than flashing the sign-in page.
  if (status === "loading" || status === "idle") return null;

  if (!isAuthenticated) {
    // Preserve the attempted location so we can bounce back after sign-in.
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
