import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { AuditAction, AuditLogEntry } from "@features/audit-logs/types";

interface ListArgs extends PageRequest {
  search?: string;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export const auditLogsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuditLogs: build.query<ApiPage<AuditLogEntry>, ListArgs | void>({
      query: (params) => ({ url: "/super/audit-logs", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "AuditLog", id: "LIST" }],
    }),
    getAuditLog: build.query<AuditLogEntry, string>({
      query: (id) => ({ url: `/super/audit-logs/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "AuditLog", id }],
    }),
  }),
  overrideExisting: false,
});

export const { useListAuditLogsQuery, useGetAuditLogQuery } = auditLogsApi;
