import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import type { Role } from "@shared/constants/roles";

export interface AuthUser {
  id: string | number;
  email: string;
  fullName: string;
  roles: Role[];
  avatarUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
}

const initialState: AuthState = {
  user: appStorage.get<AuthUser>(STORAGE_KEYS.user),
  accessToken: appStorage.get<string>(STORAGE_KEYS.accessToken),
  status: appStorage.get<string>(STORAGE_KEYS.accessToken)
    ? "authenticated"
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
    authSuccess(
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken?: string;
      }>,
    ) {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.status = "authenticated";
      state.error = null;
      appStorage.set(STORAGE_KEYS.accessToken, accessToken);
      if (refreshToken) appStorage.set(STORAGE_KEYS.refreshToken, refreshToken);
      appStorage.set(STORAGE_KEYS.user, user);
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
      appStorage.remove(STORAGE_KEYS.refreshToken);
      appStorage.remove(STORAGE_KEYS.user);
    },
    userUpdated(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        appStorage.set(STORAGE_KEYS.user, state.user);
      }
    },
  },
});

export const { authLoading, authSuccess, authFailed, logout, userUpdated } =
  authSlice.actions;
export default authSlice.reducer;
