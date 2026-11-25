import { baseApi } from "@lib/query/baseApi";
import type { ApiPage } from "@shared/types/api";
import type { UUID } from "@shared/types/lms";
import type {
  AccountApprovalDto,
  ListAccountApprovalsArgs,
  RejectAccountRequest,
} from "@features/account-approvals/types";

/** Every list and count of sign-ups waiting for (or refused) approval. */
export const ACCOUNT_APPROVALS_TAG = { type: "User" as const, id: "APPROVALS" };

/**
 * What a decision changes elsewhere: the account's status shows on the Users
 * table and on its profile page. Invalidated on a refusal too — a 409 or 404
 * means someone else decided (or the account went) meanwhile, and the lists
 * should show that.
 */
const decidedTags = (userId: UUID) => [
  ACCOUNT_APPROVALS_TAG,
  { type: "User" as const, id: "LIST" },
  { type: "User" as const, id: userId },
  { type: "User" as const, id: `PROFILE-${userId}` },
];

/**
 * The super admin's approval of new İştirakçi accounts (`user:approve`). A
 * sign-up on the website, or a first Google / Apple sign-in, waits as
 * PENDING_APPROVAL and cannot sign in until it is approved; a rejected one can
 * still be approved later.
 */
export const accountApprovalsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Backend `GET /api/super/account-approvals` — pending ones oldest first, the queue's order. */
    listAccountApprovals: build.query<ApiPage<AccountApprovalDto>, ListAccountApprovalsArgs>({
      query: (params) => ({ url: "/super/account-approvals", method: "GET", params }),
      providesTags: [ACCOUNT_APPROVALS_TAG],
    }),
    /** Backend `POST /api/super/account-approvals/{userId}/approve` — the account becomes ACTIVE and is e-mailed. */
    approveAccount: build.mutation<AccountApprovalDto, UUID>({
      query: (userId) => ({ url: `/super/account-approvals/${userId}/approve`, method: "POST" }),
      invalidatesTags: (_r, _e, userId) => decidedTags(userId),
    }),
    /** Backend `POST /api/super/account-approvals/{userId}/reject` — REJECTED, e-mailed with the reason. */
    rejectAccount: build.mutation<AccountApprovalDto, { userId: UUID } & RejectAccountRequest>({
      query: ({ userId, reason }) => ({
        url: `/super/account-approvals/${userId}/reject`,
        method: "POST",
        data: { reason },
      }),
      invalidatesTags: (_r, _e, { userId }) => decidedTags(userId),
    }),
  }),
  overrideExisting: false,
});

export const { useListAccountApprovalsQuery, useApproveAccountMutation, useRejectAccountMutation } =
  accountApprovalsApi;
