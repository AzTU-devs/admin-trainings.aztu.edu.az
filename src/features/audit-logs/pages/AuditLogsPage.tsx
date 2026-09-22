import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { DataTable } from "@shared/components/tables/DataTable";
import { Kicker } from "@shared/components/bright";
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
import { cn } from "@shared/lib/cn";
import { formatEnum } from "@shared/lib/enums";
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

/*
 * A log is read by scanning, so its rows sit a little tighter than the
 * default table (≈56px). The full-width loading / empty cells carry a
 * colSpan and keep their own padding.
 */
const LOG_DENSITY = "[&_td:not([colspan])]:py-2.5";

/*
 * On a phone five columns cannot fit, so each row becomes a stacked card: the
 * first cell carries a phone layout (EntryCard) and the other cells and the
 * header row hide. A fixed table layout lets long values truncate inside the
 * card instead of pushing the table wider than the screen.
 */
const MOBILE_STACK = cn(
  "max-sm:[&_table]:table-fixed max-sm:[&_thead]:hidden",
  "max-sm:[&_td:not([colspan]):not(:first-child)]:hidden",
  "max-sm:[&_td:first-child:not([colspan])]:px-5 max-sm:[&_td:first-child:not([colspan])]:py-3.5",
);

/** Timestamps, ids and addresses are technical values: JetBrains Mono, one size down. */
const MONO = "font-mono text-[12px] tracking-normal";

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
          <>
            <time dateTime={row.original.occurredAt} className={cn(MONO, "whitespace-nowrap text-ink-2 max-sm:hidden")}>
              {new Date(row.original.occurredAt).toLocaleString()}
            </time>
            <EntryCard entry={row.original} />
          </>
        ),
      },
      {
        header: "Actor",
        cell: ({ row }) => <ActorCell entry={row.original} className="max-w-[240px]" />,
      },
      {
        header: "Action",
        cell: ({ row }) => <ActionBadge action={row.original.action} />,
      },
      {
        header: "Resource",
        cell: ({ row }) => <ResourceRef type={row.original.resourceType} id={row.original.resourceId} />,
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
      <PageHeader title="Audit logs" description="Every consequential action across the portal — who, what, when, where." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            {/* Same words as the Action column ("Login"); the value sent stays the enum. */}
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{formatEnum(a)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable<AuditLogEntry>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        // A failed request must not read as "nothing matched" — a clean record.
        emptyTitle="No audit entries"
        emptyDescription="Nothing matched your filters."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        onRowClick={(r) => setDetail(r)}
        getRowId={(r) => String(r.id)}
        className={cn(LOG_DENSITY, MOBILE_STACK)}
      />

      <AuditEntryDialog detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

/**
 * The action in sentence case ("Login", as Security writes its events), in
 * the action's own tone.
 */
function ActionBadge({ action, className }: { action: AuditAction; className?: string }) {
  return (
    <Badge tone={ACTION_TONE[action]} size="sm" dot className={className}>
      {formatEnum(action)}
    </Badge>
  );
}

/**
 * `TYPE#id` in mono: the type in ink so a column of them scans by kind, the
 * id a step quieter. Same text as before, two tones.
 */
function ResourceRef({ type, id, wrap, className }: { type: string; id?: string; wrap?: boolean; className?: string }) {
  return (
    <code className={cn(MONO, wrap ? "break-all" : "whitespace-nowrap", className)}>
      <span className="font-semibold text-ink">{type}</span>
      {id !== undefined && <span className="text-ink-3">#{id}</span>}
    </code>
  );
}

/** Avatar with the name over the email; both lines truncate (the full text is the tooltip). */
function ActorCell({ entry, className }: { entry: AuditLogEntry; className?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback name={entry.actorName || entry.actorEmail} />
      </Avatar>
      <div className={cn("min-w-0", className)}>
        {/* Truncated lines keep their full text as a tooltip. */}
        <p title={entry.actorName} className="truncate font-medium text-ink">{entry.actorName}</p>
        <p title={entry.actorEmail} className="truncate text-[12.5px] text-ink-3">{entry.actorEmail}</p>
      </div>
    </div>
  );
}

/**
 * One entry as a phone card (hidden from sm up, where the columns show): the
 * action pill and the time, then the actor, then resource · IP in mono.
 */
function EntryCard({ entry: e }: { entry: AuditLogEntry }) {
  return (
    <div className="min-w-0 space-y-2.5 sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <ActionBadge action={e.action} className="shrink-0" />
        <time dateTime={e.occurredAt} className={cn(MONO, "min-w-0 truncate text-ink-3")}>
          {new Date(e.occurredAt).toLocaleString()}
        </time>
      </div>
      <ActorCell entry={e} />
      <div className="flex min-w-0 items-center gap-1.5 text-ink-3">
        <ResourceRef type={e.resourceType} id={e.resourceId} className="block min-w-0 truncate" />
        <span aria-hidden className="shrink-0">·</span>
        <span className={cn(MONO, "shrink-0")}>{e.ipAddress ?? "—"}</span>
      </div>
    </div>
  );
}

function AuditEntryDialog({ detail, onClose }: { detail: AuditLogEntry | null; onClose: () => void }) {
  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            Audit entry{" "}
            {/* Ids are UUIDs: on their own mono line they read, and never
                break the display title mid-word. */}
            <span className="mt-1 block break-all font-mono text-[12px] font-medium tracking-normal text-ink-3 sm:text-[13px]">
              #{detail?.id}
            </span>
          </DialogTitle>
          <DialogDescription className={MONO}>
            {detail && new Date(detail.occurredAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        {detail && (
          <div className="space-y-6">
            {/* Facts on hairlines: a 1px gap over the line colour draws the grid. */}
            {/* The left column is wider: it carries the actor and the resource id. */}
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] bg-line shadow-[0_0_0_1px_var(--line)] sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
              <Field label="Actor">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback name={detail.actorName || detail.actorEmail} />
                  </Avatar>
                  {/* Name over email, as in the table, rather than one run-on line. */}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{detail.actorName}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">{detail.actorEmail}</span>
                  </span>
                </span>
              </Field>
              <Field label="Action">
                <ActionBadge action={detail.action} />
              </Field>
              <Field label="Resource">
                <ResourceRef type={detail.resourceType} id={detail.resourceId} wrap />
              </Field>
              <Field label="IP">
                <span className={MONO}>{detail.ipAddress ?? "—"}</span>
              </Field>
              <Field label="User agent" className="sm:col-span-2">
                <span className={cn(MONO, "break-all text-ink-2")}>{detail.userAgent ?? "—"}</span>
              </Field>
            </dl>
            {detail.changes && Object.keys(detail.changes).length > 0 && (
              <Section title="Changes">
                <ul className="space-y-2.5">
                  {Object.entries(detail.changes).map(([k, v]) => (
                    <li key={k} className="rounded-[18px] border border-line p-3.5">
                      <p className={cn(MONO, "mb-2 font-semibold text-ink-2")}>{k}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <pre className={cn(MONO, "overflow-auto rounded-xl bg-danger-tint p-2.5 text-ink")}>{JSON.stringify(v.from, null, 2)}</pre>
                        <pre className={cn(MONO, "overflow-auto rounded-xl bg-ok-tint p-2.5 text-ink")}>{JSON.stringify(v.to, null, 2)}</pre>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {detail.context && Object.keys(detail.context).length > 0 && (
              <Section title="Context">
                <pre className={cn(MONO, "overflow-auto rounded-[18px] bg-paper-2 p-3.5 text-ink-2")}>
                  {JSON.stringify(detail.context, null, 2)}
                </pre>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 bg-surface px-4 py-3", className)}>
      <dt className="text-[12.5px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <Kicker as="h3" className="mb-3">{title}</Kicker>
      {children}
    </section>
  );
}
