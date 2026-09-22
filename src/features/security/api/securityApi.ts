import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type {
  BlockedIp,
  SecurityEvent,
  SecurityEventKind,
  SecurityOverview,
} from "@features/security/types";

interface ListArgs extends PageRequest {
  kind?: SecurityEventKind;
  search?: string;
}

export const securityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSecurityOverview: build.query<SecurityOverview, void>({
      query: () => ({ url: "/super/security/overview", method: "GET" }),
      // Tagged so a block or unblock refreshes the "Blocked IPs" counter — it
      // used to stay stale until a full reload.
      providesTags: ["SecurityOverview"],
    }),
    listSecurityEvents: build.query<ApiPage<SecurityEvent>, ListArgs | void>({
      query: (params) => ({ url: "/super/security/events", method: "GET", params: params ?? undefined }),
      providesTags: ["SecurityOverview"],
    }),
    /**
     * `GET /super/security/blocked-ips` — newest first. The API sends a plain
     * list; a page is accepted too in case it ever becomes paged.
     */
    listBlockedIps: build.query<BlockedIp[], void>({
      query: () => ({ url: "/super/security/blocked-ips", method: "GET" }),
      transformResponse: (res: BlockedIp[] | ApiPage<BlockedIp>) =>
        Array.isArray(res) ? res : (res?.content ?? []),
      providesTags: ["BlockedIps"],
    }),
    blockIp: build.mutation<void, { ipAddress: string; reason?: string }>({
      query: (body) => ({ url: "/super/security/block-ip", method: "POST", data: body }),
      invalidatesTags: ["BlockedIps", "SecurityOverview"],
    }),
    /** `DELETE /super/security/blocked-ips/{id}` — takes effect immediately. */
    unblockIp: build.mutation<void, string>({
      query: (id) => ({ url: `/super/security/blocked-ips/${id}`, method: "DELETE" }),
      invalidatesTags: ["BlockedIps", "SecurityOverview"],
    }),
    unlockAccount: build.mutation<void, string>({
      query: (userId) => ({ url: `/super/security/unlock/${userId}`, method: "POST" }),
      invalidatesTags: ["SecurityOverview", { type: "User", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSecurityOverviewQuery,
  useListSecurityEventsQuery,
  useListBlockedIpsQuery,
  useBlockIpMutation,
  useUnblockIpMutation,
  useUnlockAccountMutation,
} = securityApi;
