import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { logout as logoutAction } from "@features/auth/store/authSlice";
import { useLogoutMutation } from "@features/auth/api/authApi";

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const [logoutMutation] = useLogoutMutation();

  const signOut = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) {
        try {
          await logoutMutation().unwrap();
        } catch {
          /* tolerate server-side logout failure */
        }
      }
      dispatch(logoutAction());
    },
    [dispatch, logoutMutation],
  );

  return {
    user: auth.user,
    accessToken: auth.accessToken,
    status: auth.status,
    isAuthenticated: auth.status === "authenticated" && !!auth.user,
    isLoading: auth.status === "loading",
    error: auth.error,
    signOut,
  };
}
