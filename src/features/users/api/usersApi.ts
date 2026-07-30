import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { AdminUser, CreateUserRequest, UpdateUserRequest, UserStatus } from "@features/users/types";
import type { Role } from "@shared/constants/roles";

interface ListArgs extends PageRequest {
  search?: string;
  role?: Role;
  status?: UserStatus;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<ApiPage<AdminUser>, ListArgs | void>({
      query: (params) => ({ url: "/admin/users", method: "GET", params: params ?? undefined }),
      providesTags: (res) =>
        res
          ? [...res.content.map((u) => ({ type: "User" as const, id: u.id })), { type: "User" as const, id: "LIST" }]
          : [{ type: "User", id: "LIST" }],
    }),
    createUser: build.mutation<AdminUser, CreateUserRequest>({
      query: (body) => ({ url: "/admin/users", method: "POST", data: body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: build.mutation<AdminUser, { id: string; body: UpdateUserRequest }>({
      query: ({ id, body }) => ({ url: `/admin/users/${id}`, method: "PUT", data: body }),
      invalidatesTags: (_r, _e, a) => [{ type: "User", id: a.id }, { type: "User", id: "LIST" }],
    }),
    setUserStatus: build.mutation<AdminUser, { id: string; status: UserStatus }>({
      query: ({ id, status }) => ({ url: `/admin/users/${id}/status`, method: "PATCH", data: { status } }),
      invalidatesTags: (_r, _e, a) => [{ type: "User", id: a.id }, { type: "User", id: "LIST" }],
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `/admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    /* SUPER_ADMIN only — clears an account lockout. */
    unlockUser: build.mutation<void, string>({
      query: (userId) => ({ url: `/super/security/unlock/${userId}`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "User", id }, { type: "User", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useDeleteUserMutation,
  useUnlockUserMutation,
} = usersApi;
