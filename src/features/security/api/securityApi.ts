import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type {
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
    }),
    listSecurityEvents: build.query<ApiPage<SecurityEvent>, ListArgs | void>({
      query: (params) => ({ url: "/super/security/events", method: "GET", params: params ?? undefined }),
    }),
    blockIp: build.mutation<void, { ipAddress: string; reason?: string }>({
      query: (body) => ({ url: "/super/security/block-ip", method: "POST", data: body }),
    }),
    unlockAccount: build.mutation<void, number>({
      query: (userId) => ({ url: `/super/security/unlock/${userId}`, method: "POST" }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSecurityOverviewQuery,
  useListSecurityEventsQuery,
  useBlockIpMutation,
  useUnlockAccountMutation,
} = securityApi;
