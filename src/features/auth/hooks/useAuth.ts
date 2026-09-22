import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { logout as logoutAction } from "@features/auth/store/authSlice";
import { useLogoutMutation } from "@features/auth/api/authApi";
import { baseApi } from "@lib/query/baseApi";

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
      // Drop everything cached under this account: the next person to sign in
      // on this tab must not see it, nor be judged by it (a cached 404 for one
      // user's expert profile would bounce the next user's too).
      dispatch(baseApi.util.resetApiState());
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
