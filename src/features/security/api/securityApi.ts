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
      providesTags: [{ type: "Security", id: "OVERVIEW" }],
    }),
    listSecurityEvents: build.query<ApiPage<SecurityEvent>, ListArgs | void>({
      query: (params) => ({ url: "/super/security/events", method: "GET", params: params ?? undefined }),
    }),
    listBlockedIps: build.query<BlockedIp[], void>({
      query: () => ({ url: "/super/security/blocked-ips", method: "GET" }),
      providesTags: [{ type: "Security", id: "BLOCKED" }],
    }),
    // Both change the list and the "Blocked IPs" count on the overview.
    blockIp: build.mutation<void, { ipAddress: string; reason?: string }>({
      query: (body) => ({ url: "/super/security/block-ip", method: "POST", data: body }),
      invalidatesTags: [{ type: "Security", id: "BLOCKED" }, { type: "Security", id: "OVERVIEW" }],
    }),
    unblockIp: build.mutation<void, string>({
      query: (id) => ({ url: `/super/security/blocked-ips/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Security", id: "BLOCKED" }, { type: "Security", id: "OVERVIEW" }],
    }),
    unlockAccount: build.mutation<void, string>({
      query: (userId) => ({ url: `/super/security/unlock/${userId}`, method: "POST" }),
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
