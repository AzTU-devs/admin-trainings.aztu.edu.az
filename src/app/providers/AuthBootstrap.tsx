import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { userUpdated } from "@features/auth/store/authSlice";
import { useMeQuery } from "@features/auth/api/authApi";
import { env } from "@shared/config/env";

/**
 * When a token is present, fetch the authoritative current user from
 * `GET /auth/me` and refresh the auth slice. This guarantees roles/permissions
 * are current — independent of what the login payload contained or whatever
 * (possibly stale) user object was hydrated from storage on boot.
 */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  // Skip under the dev auth bypass — its synthetic token would 401 and log out.
  const bypass = env.app.isDev && env.auth.bypass;
  const { data } = useMeQuery(undefined, { skip: !accessToken || bypass });

  useEffect(() => {
    if (data) {
      dispatch(userUpdated({ id: data.id, email: data.email, fullName: data.fullName, roles: data.roles }));
    }
  }, [data, dispatch]);

  return null;
}
