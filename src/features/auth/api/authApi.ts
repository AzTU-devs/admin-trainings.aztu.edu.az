import { baseApi } from "@lib/query/baseApi";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import {
  toAuthUser,
  type BackendAuthTokens,
  type BackendUserDto,
  type LoginRequest,
  type LoginResult,
} from "@features/auth/types";
import type { AuthUser } from "@features/auth/store/authSlice";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResult, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        data: { email: body.email, password: body.password },
        skipAuth: true,
      }),
      transformResponse: (res: BackendAuthTokens): LoginResult => ({
        user: toAuthUser(res.user),
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      }),
      invalidatesTags: ["Me"],
    }),

    logout: build.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
        data: { refreshToken: appStorage.get<string>(STORAGE_KEYS.refreshToken) },
      }),
    }),

    me: build.query<AuthUser, void>({
      query: () => ({ url: "/auth/me", method: "GET" }),
      transformResponse: (res: BackendUserDto): AuthUser => toAuthUser(res),
      providesTags: ["Me"],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation, useMeQuery, useLazyMeQuery } =
  authApi;
