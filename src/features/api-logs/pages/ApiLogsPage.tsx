import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { Switch } from "@shared/components/ui/Switch";
import { Label } from "@shared/components/ui/Label";
import { useListApiLogsQuery } from "@features/api-logs/api/apiLogsApi";
import type { ApiLogEntry, HttpMethod } from "@features/api-logs/types";

const METHOD_TONE: Record<HttpMethod, "brand" | "success" | "warning" | "danger" | "neutral" | "gold"> = {
  GET: "brand",
  POST: "success",
  PUT: "warning",
  PATCH: "gold",
  DELETE: "danger",
  OPTIONS: "neutral",
};

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

function statusTone(status: number): "success" | "brand" | "warning" | "danger" {
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "brand";
  return "success";
}

export default function ApiLogsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<HttpMethod | "ALL">("ALL");
  const [errorsOnly, setErrorsOnly] = useState(false);

  const { data, isFetching } = useListApiLogsQuery({
    page,
    size: 30,
    search: search || undefined,
    method: method === "ALL" ? undefined : method,
    errorsOnly: errorsOnly || undefined,
    statusMin: errorsOnly ? 400 : undefined,
  });

  const columns = useMemo<ColumnDef<ApiLogEntry>[]>(
    () => [
      {
        header: "When",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
            {new Date(row.original.occurredAt).toLocaleTimeString()}
          </span>
        ),
      },
      {
        header: "Method",
        cell: ({ row }) => <Badge tone={METHOD_TONE[row.original.method]}>{row.original.method}</Badge>,
      },
      {
        header: "Path",
        cell: ({ row }) => (
          <code className="text-xs text-gray-700 dark:text-gray-300 break-all">{row.original.path}</code>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => <Badge tone={statusTone(row.original.status)}>{row.original.status}</Badge>,
      },
      {
        header: "Latency",
        cell: ({ row }) => (
          <span className={row.original.latencyMs > 1000 ? "text-error-600 font-medium" : "text-gray-700 dark:text-gray-300"}>
            {row.original.latencyMs} ms
          </span>
        ),
      },
      {
        header: "Actor",
        cell: ({ row }) => (
          <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] block">
            {row.original.actorEmail ?? "anonymous"}
          </span>
        ),
      },
      { header: "IP", cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.ipAddress ?? "—"}</span> },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="API logs" description="HTTP request log — useful for tracing slow / failing endpoints." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center">
        <Input
          placeholder="Search by path or actor…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-sm"
        />
        <Select value={method} onValueChange={(v) => { setMethod(v as HttpMethod | "ALL"); setPage(0); }}>
          <SelectTrigger className="sm:max-w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All methods</SelectItem>
            {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <Switch checked={errorsOnly} onCheckedChange={(c) => { setErrorsOnly(!!c); setPage(0); }} />
          <Label className="!mb-0">Errors only (≥ 400)</Label>
        </label>
      </div>

      <DataTable<ApiLogEntry>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No requests in this window"
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
      />
    </>
  );
}
