import { baseApi } from "@lib/query/baseApi";
import {
  toAuthUser,
  type BackendAuthTokens,
  type BackendUserDto,
  type LoginRequest,
  type LoginResult,
  type UpdateMeRequest,
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
      // res.refreshToken is dropped on purpose — see BackendAuthTokens.
      transformResponse: (res: BackendAuthTokens): LoginResult => ({
        user: toAuthUser(res.user),
        accessToken: res.accessToken,
      }),
      invalidatesTags: ["Me"],
    }),

    /**
     * Sends no token: the API reads it from the `ep_portal_rt` cookie (httpClient is
     * credentialed) and clears that cookie in the same response, so the server-side
     * revocation and the browser-side cleanup cannot drift apart.
     */
    logout: build.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
        data: {},
      }),
    }),

    me: build.query<AuthUser, void>({
      query: () => ({ url: "/auth/me", method: "GET" }),
      transformResponse: (res: BackendUserDto): AuthUser => toAuthUser(res),
      providesTags: ["Me"],
    }),

    /** Raw profile DTO (firstName/lastName/phone/locale) for the settings form. */
    meProfile: build.query<BackendUserDto, void>({
      query: () => ({ url: "/auth/me", method: "GET" }),
      providesTags: ["Me"],
    }),

    /** Update my profile — backend `PUT /api/auth/me`. */
    updateMe: build.mutation<AuthUser, UpdateMeRequest>({
      query: (body) => ({ url: "/auth/me", method: "PUT", data: body }),
      transformResponse: (res: BackendUserDto): AuthUser => toAuthUser(res),
      invalidatesTags: ["Me"],
    }),

    /** Request a password reset link — backend `POST /api/auth/password/forgot` (always 202). */
    forgotPassword: build.mutation<void, { email: string }>({
      query: (body) => ({ url: "/auth/password/forgot", method: "POST", data: body, skipAuth: true }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useMeProfileQuery,
  useUpdateMeMutation,
  useForgotPasswordMutation,
} = authApi;
