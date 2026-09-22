import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@features/auth/hooks/useAuth";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useGetMyTutorProfileQuery } from "@features/tutors/api/tutorsApi";
import { toNormalizedError } from "@shared/lib/apiError";
import { ROUTES } from "@shared/constants/routes";

interface Props {
  /** Where to send unauthenticated users. Defaults to /sign-in. */
  redirectTo?: string;
}

/** Shown on the sign-in page to a participant who signed in here by mistake. */
export const PARTICIPANT_NOTICE =
  "This portal is for experts and staff. Participants use trainings.aztu.edu.az to find and take courses.";

export function ProtectedRoute({ redirectTo = ROUTES.signIn }: Props) {
  const { status, isAuthenticated, signOut } = useAuth();
  const { isTutor, isStaff } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  /*
   * Any account could sign in here, and a participant — or an expert whose
   * application is still pending or was rejected (they hold only USER until
   * approved) — landed on a staff dashboard whose every action was a 403. Such an
   * account is let in only if it has an expert application, so the applicant
   * can see its status; a plain participant is signed out with a pointer to
   * the public site.
   */
  const needsApplication = isAuthenticated && !isTutor && !isStaff;
  const application = useGetMyTutorProfileQuery(undefined, { skip: !needsApplication });
  const noApplication =
    needsApplication && application.isError && toNormalizedError(application.error).status === 404;

  const signingOut = useRef(false);
  useEffect(() => {
    if (!noApplication || signingOut.current) return;
    signingOut.current = true;
    // Server-side sign-out too: it clears the refresh cookie, which a new tab
    // would otherwise use to sign the participant straight back in.
    void signOut().then(() =>
      navigate(redirectTo, { replace: true, state: { notice: PARTICIPANT_NOTICE } }),
    );
  }, [noApplication, signOut, navigate, redirectTo]);

  // Still resolving the session (e.g. refreshing the token) — render nothing
  // rather than flashing the sign-in page.
  if (status === "loading" || status === "idle") return null;

  if (!isAuthenticated) {
    // Preserve the attempted location so we can bounce back after sign-in.
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (needsApplication && (application.isLoading || noApplication)) return null;

  return <Outlet />;
}
