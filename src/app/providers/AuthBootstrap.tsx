import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { authSuccess, logout, tokenRefreshed, userUpdated } from "@features/auth/store/authSlice";
import { useMeQuery } from "@features/auth/api/authApi";
import { toAuthUser, type BackendUserDto } from "@features/auth/types";
import { http, refreshAccessToken, refreshSession } from "@lib/axios/httpClient";
import { decodeJwtPayload } from "@lib/auth/jwt";
import { baseApi, TAGS } from "@lib/query/baseApi";
import { env } from "@shared/config/env";

function sameRoles(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((r) => b.includes(r));
}

/**
 * Keeps the session current.
 *
 * 1. A tab that starts without an access token (every new tab: the token is
 *    tab-scoped) turns the 30-day refresh cookie into a session once, instead of
 *    sending the user to sign in again. Only a failed refresh signs them out.
 * 2. With a token, fetches the authoritative current user from `GET /auth/me`,
 *    so roles are current whatever the login payload or storage said.
 * 3. When those roles differ from the ones inside the token — an admin changed
 *    them — refreshes the token once, so the API stops judging requests by the
 *    old roles, and refetches everything that was loaded under them. Without it
 *    a promoted user saw the new menu and a 403 on every page it opened.
 */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const status = useAppSelector((s) => s.auth.status);

  // Skip under the dev auth bypass — its synthetic token would 401 and log out.
  const bypass = env.app.isDev && env.auth.bypass;
  const { data } = useMeQuery(undefined, { skip: !accessToken || bypass });

  // (1) Restore a session in a fresh tab from the refresh cookie.
  useEffect(() => {
    if (status !== "idle" || bypass) return;
    let cancelled = false;
    // Shares the in-flight call, so StrictMode's double effect costs one refresh.
    refreshSession()
      .then(async ({ accessToken: token, user }) => {
        const dto = (user as BackendUserDto | undefined) ??
          (await http.get<{ data: BackendUserDto }>("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          })).data;
        if (!cancelled) dispatch(authSuccess({ user: toAuthUser(dto), accessToken: token }));
      })
      .catch(() => {
        if (!cancelled) dispatch(logout());
      });
    return () => {
      cancelled = true;
    };
  }, [status, bypass, dispatch]);

  // (2) Authoritative user.
  useEffect(() => {
    if (data) {
      dispatch(
        userUpdated({
          id: data.id,
          email: data.email,
          fullName: data.fullName,
          roles: data.roles,
          permissions: data.permissions,
        }),
      );
    }
  }, [data, dispatch]);

  // (3) Roles changed under a still-valid token.
  const refreshedFor = useRef<string | null>(null);
  const syncs = useRef(0);
  useEffect(() => {
    if (!data || !accessToken || bypass) return;
    const claimed = decodeJwtPayload(accessToken)?.roles;
    if (!claimed || sameRoles(claimed, data.roles)) return;
    // Once per token, and a few times per tab at most: if the API ever minted
    // tokens whose claim never matched /auth/me, this must not refresh forever.
    if (refreshedFor.current === accessToken || syncs.current >= 3) return;
    refreshedFor.current = accessToken;
    syncs.current += 1;
    void refreshAccessToken()
      .then((token) => {
        dispatch(tokenRefreshed(token));
        dispatch(baseApi.util.invalidateTags([...TAGS]));
      })
      .catch(() => undefined);
  }, [data, accessToken, bypass, dispatch]);

  return null;
}
