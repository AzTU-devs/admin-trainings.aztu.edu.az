import { Fragment, useMemo, useState } from "react";
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
import { cn } from "@shared/lib/cn";
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

/*
 * A request log is read by scanning, so its rows sit a little tighter than
 * the default table. The full-width loading / empty cells carry a colSpan and
 * keep their own padding.
 */
const LOG_DENSITY = "[&_td:not([colspan])]:py-2.5";

/*
 * On a phone seven columns cannot fit, so each row becomes a stacked card: the
 * first cell carries a phone layout (RequestCard) and the other cells and the
 * header row hide. A fixed table layout lets long values truncate inside the
 * card instead of pushing the table wider than the screen.
 */
const MOBILE_STACK = cn(
  "max-sm:[&_table]:table-fixed max-sm:[&_thead]:hidden",
  "max-sm:[&_td:not([colspan]):not(:first-child)]:hidden",
  "max-sm:[&_td:first-child:not([colspan])]:px-5 max-sm:[&_td:first-child:not([colspan])]:py-3.5",
);

/*
 * The Path column is the one people scan, so it takes all the width the other
 * columns leave (w-full) and stays on one line: `max-w-0` lets it give way,
 * with an ellipsis and the full path on hover, instead of pushing the table
 * wider — and the floor keeps it readable when the table is squeezed. (It
 * used to break anywhere, so /api/media/<uuid>/content split mid-word and
 * doubled the row.) The cell is found by RequestPath's data attribute.
 */
const PATH_COLUMN = "sm:[&_td:has(>[data-path])]:w-full sm:[&_td:has(>[data-path])]:max-w-0 sm:[&_td:has(>[data-path])]:min-w-[14rem]";

/** Timestamps, paths, codes and durations are technical values: JetBrains Mono, one size down. */
const MONO = "font-mono text-[12px] tracking-normal";

/** Path segments in mono with the slashes a step quieter, so they read as words. */
function Segments({ parts, lead }: { parts: string[]; lead: boolean }) {
  return parts.map((part, i) => (
    <Fragment key={i}>
      {(lead || i > 0) && <span className="text-ink-3">/</span>}
      {part}
    </Fragment>
  ));
}

/**
 * The path exactly as logged, on one line. When it does not fit, the middle
 * gives way — the ellipsis lands inside an id — and the last segment stays
 * (`…/ee2948…/content`), since that names the endpoint; the whole path is
 * the tooltip.
 */
function RequestPath({ path }: { path: string }) {
  const parts = path.split("/");
  // No tail to keep for "/" or a path ending in a slash: it all truncates at the end.
  const tail = parts.length > 2 && parts[parts.length - 1] ? parts[parts.length - 1] : null;
  return (
    <code data-path title={path} className={cn(MONO, "flex min-w-0 leading-5 text-ink")}>
      <span className="min-w-[3ch] truncate">
        <Segments parts={tail ? parts.slice(0, -1) : parts} lead={false} />
      </span>
      {tail && (
        <span className="max-w-[70%] shrink-0 truncate">
          <Segments parts={[tail]} lead />
        </span>
      )}
    </code>
  );
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
          <>
            <time dateTime={row.original.occurredAt} className={cn(MONO, "whitespace-nowrap text-ink-2 max-sm:hidden")}>
              {new Date(row.original.occurredAt).toLocaleTimeString()}
            </time>
            <RequestCard entry={row.original} />
          </>
        ),
      },
      {
        header: "Method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Path",
        cell: ({ row }) => <RequestPath path={row.original.path} />,
      },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: "Latency",
        cell: ({ row }) => <Latency ms={row.original.latencyMs} />,
      },
      {
        header: "Actor",
        // Capped a little tighter than before so the Path column gets the room.
        cell: ({ row }) => <Actor email={row.original.actorEmail} className="block max-w-[200px]" />,
      },
      {
        header: "IP",
        cell: ({ row }) => (
          <span className={cn(MONO, "whitespace-nowrap text-ink-3")}>{row.original.ipAddress ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="API logs" description="HTTP request log — useful for tracing slow / failing endpoints." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
        {/* The switch sits in a field-height pill so the toolbar reads as one
            row of controls; it turns navy-tint while the filter is on. */}
        <label
          className={cn(
            "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2.5 self-start rounded-full pl-2.5 pr-4 transition-[background-color,box-shadow] duration-200 sm:self-auto",
            errorsOnly
              ? "bg-navy-tint shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--navy)_35%,transparent)]"
              : "bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]",
          )}
        >
          <Switch checked={errorsOnly} onCheckedChange={(c) => { setErrorsOnly(!!c); setPage(0); }} />
          <Label className="!mb-0 cursor-pointer whitespace-nowrap">Errors only (≥ 400)</Label>
        </label>
      </div>

      <DataTable<ApiLogEntry>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        // A failed request must not read as an empty window.
        emptyTitle="No requests in this window"
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
        className={cn(LOG_DENSITY, MOBILE_STACK, PATH_COLUMN)}
      />
    </>
  );
}

/** A fixed minimum width keeps a column of verbs aligned on their left edge. */
function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <Badge tone={METHOD_TONE[method]} size="sm" className={cn(MONO, "min-w-[3.25rem] justify-center text-[11px] font-semibold")}>
      {method}
    </Badge>
  );
}

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge tone={statusTone(status)} size="sm" dot className={cn(MONO, "text-[11px] font-semibold")}>
      {status}
    </Badge>
  );
}

/** Over a second reads as slow: red and bold. */
function Latency({ ms }: { ms: number }) {
  return (
    <span className={cn(MONO, "whitespace-nowrap", ms > 1000 ? "font-semibold text-danger" : "text-ink-2")}>
      {ms} ms
    </span>
  );
}

function Actor({ email, className }: { email?: string; className?: string }) {
  return (
    // Truncated emails keep the full address as a tooltip.
    <span title={email} className={cn("truncate text-[13px]", email ? "text-ink-2" : "text-ink-3", className)}>
      {email ?? "anonymous"}
    </span>
  );
}

/**
 * One request as a phone card (hidden from sm up, where the columns show):
 * method, status and latency; the path on one truncated mono line; then
 * time · actor · IP.
 */
function RequestCard({ entry: e }: { entry: ApiLogEntry }) {
  return (
    <div className="min-w-0 space-y-2 sm:hidden">
      <div className="flex items-center gap-2">
        <MethodBadge method={e.method} />
        <StatusBadge status={e.status} />
        <span className="ml-auto">
          <Latency ms={e.latencyMs} />
        </span>
      </div>
      <RequestPath path={e.path} />
      <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
        <time dateTime={e.occurredAt} className={cn(MONO, "shrink-0 text-ink-2")}>
          {new Date(e.occurredAt).toLocaleTimeString()}
        </time>
        <span aria-hidden className="shrink-0">·</span>
        <Actor email={e.actorEmail} className="min-w-0 text-[12.5px]" />
        <span aria-hidden className="shrink-0">·</span>
        <span className={cn(MONO, "shrink-0")}>{e.ipAddress ?? "—"}</span>
      </div>
    </div>
  );
}
