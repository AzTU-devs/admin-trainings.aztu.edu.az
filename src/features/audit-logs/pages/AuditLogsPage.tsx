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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { useListAuditLogsQuery } from "@features/audit-logs/api/auditLogsApi";
import type { AuditAction, AuditLogEntry } from "@features/audit-logs/types";

const ACTION_TONE: Record<AuditAction, "brand" | "warning" | "danger" | "success" | "gold" | "neutral"> = {
  CREATE: "brand",
  UPDATE: "warning",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGOUT: "neutral",
  APPROVE: "success",
  REJECT: "danger",
  PUBLISH: "success",
  ARCHIVE: "gold",
  OTHER: "neutral",
};

const ACTIONS: AuditAction[] = [
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT",
  "APPROVE", "REJECT", "PUBLISH", "ARCHIVE", "OTHER",
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  const { data, isFetching } = useListAuditLogsQuery({
    page,
    size: 20,
    search: search || undefined,
    action: action === "ALL" ? undefined : action,
  });

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        header: "When",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
            {new Date(row.original.occurredAt).toLocaleString()}
          </span>
        ),
      },
      {
        header: "Actor",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.actorName}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.actorEmail}</p>
          </div>
        ),
      },
      {
        header: "Action",
        cell: ({ row }) => <Badge tone={ACTION_TONE[row.original.action]} dot>{row.original.action}</Badge>,
      },
      {
        header: "Resource",
        cell: ({ row }) => (
          <code className="text-xs text-gray-700 dark:text-gray-300">
            {row.original.resourceType}{row.original.resourceId !== undefined ? `#${row.original.resourceId}` : ""}
          </code>
        ),
      },
      { header: "IP", cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.ipAddress ?? "—"}</span> },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Audit logs" description="Every consequential action across the portal — who, what, when, where." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search by actor, resource, IP…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-sm"
        />
        <Select value={action} onValueChange={(v) => { setAction(v as AuditAction | "ALL"); setPage(0); }}>
          <SelectTrigger className="sm:max-w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable<AuditLogEntry>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No audit entries"
        emptyDescription="Nothing matched your filters."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(r) => setDetail(r)}
        getRowId={(r) => String(r.id)}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Audit entry #{detail?.id}</DialogTitle>
            <DialogDescription>
              {detail && new Date(detail.occurredAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Actor" value={`${detail.actorName} · ${detail.actorEmail}`} />
                <Field label="Action" value={detail.action} />
                <Field label="Resource" value={`${detail.resourceType}${detail.resourceId !== undefined ? `#${detail.resourceId}` : ""}`} />
                <Field label="IP" value={detail.ipAddress ?? "—"} />
                <Field label="User agent" value={detail.userAgent ?? "—"} className="col-span-2 truncate" />
              </div>
              {detail.changes && Object.keys(detail.changes).length > 0 && (
                <Section title="Changes">
                  <ul className="space-y-2">
                    {Object.entries(detail.changes).map(([k, v]) => (
                      <li key={k} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <p className="text-xs font-mono text-gray-500 mb-1">{k}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <pre className="bg-error-50 dark:bg-error-500/10 rounded-lg p-2 overflow-auto">{JSON.stringify(v.from, null, 2)}</pre>
                          <pre className="bg-success-50 dark:bg-success-500/10 rounded-lg p-2 overflow-auto">{JSON.stringify(v.to, null, 2)}</pre>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {detail.context && Object.keys(detail.context).length > 0 && (
                <Section title="Context">
                  <pre className="text-xs rounded-xl bg-gray-50 dark:bg-white/5 p-3 overflow-auto">
                    {JSON.stringify(detail.context, null, 2)}
                  </pre>
                </Section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
      {children}
    </div>
  );
}
