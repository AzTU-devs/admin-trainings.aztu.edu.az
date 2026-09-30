import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type { UserProfileDto } from "@features/user-profile/types";
import { normalizeUserProfile } from "@features/user-profile/lib/normalize";

export const userProfileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Everything the platform holds about one account — backend
     * `GET /api/super/users/{userId}/profile` (`user:inspect`, SUPER_ADMIN
     * only). 404 `USER_NOT_FOUND` for an unknown id; soft-deleted accounts are
     * returned with `account.deletedAt` set.
     */
    getUserProfile: build.query<UserProfileDto, UUID>({
      query: (userId) => ({ url: `/super/users/${encodeURIComponent(userId)}/profile`, method: "GET" }),
      transformResponse: (raw: UserProfileDto) => normalizeUserProfile(raw),
      providesTags: (_r, _e, userId) => [{ type: "User", id: `PROFILE-${userId}` }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetUserProfileQuery } = userProfileApi;
