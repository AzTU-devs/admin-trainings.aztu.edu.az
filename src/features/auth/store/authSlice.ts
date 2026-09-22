import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { appStorage, persistentStorage, STORAGE_KEYS } from "@lib/storage";
import type { Role } from "@shared/constants/roles";

export interface AuthUser {
  id: string | number;
  email: string;
  fullName: string;
  roles: Role[];
  /**
   * The API's permission codes (`notification:read_own`, `course:create`…).
   * Roles alone do not say what an account may call: an ADMIN, for one, has no
   * `notification:read_own`, so its notification bell was a pair of 403s on
   * every page. Undefined for a session restored from before this field existed.
   */
  permissions?: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
}

/**
 * Without a token in this tab the status starts "idle", not "unauthenticated",
 * when this browser has a session to restore: the token lives in sessionStorage,
 * so every new tab (a middle-clicked link, a URL from an email) starts without
 * one even though the 30-day refresh cookie is valid. AuthBootstrap tries that
 * cookie once; only its failure sends the user to the sign-in page.
 * ProtectedRoute renders nothing while idle.
 */
const initialState: AuthState = {
  user: appStorage.get<AuthUser>(STORAGE_KEYS.user),
  accessToken: appStorage.get<string>(STORAGE_KEYS.accessToken),
  status: appStorage.get<string>(STORAGE_KEYS.accessToken)
    ? "authenticated"
    : persistentStorage.get<boolean>(STORAGE_KEYS.sessionHint)
      ? "idle"
      : "unauthenticated",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authLoading(state) {
      state.status = "loading";
      state.error = null;
    },
    /**
     * The refresh token is intentionally absent: the API returns one in the login body
     * but the portal ignores it and relies on the httpOnly `ep_portal_rt` cookie, so
     * nothing here can leak a 30-day credential to a script on this origin.
     */
    authSuccess(
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
      }>,
    ) {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.status = "authenticated";
      state.error = null;
      appStorage.set(STORAGE_KEYS.accessToken, accessToken);
      appStorage.set(STORAGE_KEYS.user, user);
      persistentStorage.set(STORAGE_KEYS.sessionHint, true);
    },
    authFailed(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.status = "unauthenticated";
      state.error = null;
      appStorage.remove(STORAGE_KEYS.accessToken);
      appStorage.remove(STORAGE_KEYS.user);
      persistentStorage.remove(STORAGE_KEYS.sessionHint);
    },
    /** A silent refresh stored a new access token; keep the slice in step with storage. */
    tokenRefreshed(state, action: PayloadAction<string>) {
      if (state.status === "authenticated") state.accessToken = action.payload;
    },
    userUpdated(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        appStorage.set(STORAGE_KEYS.user, state.user);
      }
    },
  },
});

export const { authLoading, authSuccess, authFailed, logout, tokenRefreshed, userUpdated } =
  authSlice.actions;
export default authSlice.reducer;
