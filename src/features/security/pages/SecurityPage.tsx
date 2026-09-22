import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Gauge,
  KeyRound,
  Lock,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  ShieldPlus,
  TicketX,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { StatCard } from "@shared/components/data-display/StatCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/Tabs";
import { DataTable } from "@shared/components/tables/DataTable";
import { SoftEmpty } from "@shared/components/bright";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Label } from "@shared/components/ui/Label";
import { cn } from "@shared/lib/cn";
// `FAILED_LOGIN` → "Failed login" (MFA / IP keep their capitals), as on every other page.
import { formatEnum } from "@shared/lib/enums";
import {
  useBlockIpMutation,
  useGetSecurityOverviewQuery,
  useListSecurityEventsQuery,
} from "@features/security/api/securityApi";
import type {
  SecurityEvent,
  SecurityEventKind,
  SecuritySeverity,
} from "@features/security/types";

const SEVERITY_TONE: Record<SecuritySeverity, "neutral" | "warning" | "danger" | "brand"> = {
  INFO: "neutral",
  LOW: "brand",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

/** The event's icon tile takes the same tint as its severity pill, so a red row reads red at a glance. */
const SEVERITY_TILE: Record<SecuritySeverity, string> = {
  INFO: "bg-ink/6 text-ink-3",
  LOW: "bg-navy-tint text-navy",
  MEDIUM: "bg-warn-tint text-warn",
  HIGH: "bg-danger-tint text-danger",
  CRITICAL: "bg-danger text-on-navy",
};

const KIND_ICON: Record<SecurityEventKind, LucideIcon> = {
  FAILED_LOGIN: LogIn,
  LOCKOUT: Lock,
  PASSWORD_CHANGE: KeyRound,
  MFA_ENROLLED: ShieldPlus,
  MFA_REMOVED: ShieldOff,
  TOKEN_REVOKED: TicketX,
  SUSPICIOUS_LOGIN: ShieldAlert,
  RATE_LIMIT_TRIPPED: Gauge,
  ROLE_CHANGED: UserCog,
};

/*
 * An event log is read by scanning, so its rows sit a little tighter than
 * the default table. The full-width loading / empty cells carry a colSpan and
 * keep their own padding.
 */
const LOG_DENSITY = "[&_td:not([colspan])]:py-2.5";

/*
 * On a phone five columns cannot fit, so each row becomes a stacked card: the
 * first cell carries a phone layout (EventCard) and the other cells and the
 * header row hide. A fixed table layout lets long values truncate inside the
 * card instead of pushing the table wider than the screen.
 */
const MOBILE_STACK = cn(
  "max-sm:[&_table]:table-fixed max-sm:[&_thead]:hidden",
  "max-sm:[&_td:not([colspan]):not(:first-child)]:hidden",
  "max-sm:[&_td:first-child:not([colspan])]:px-5 max-sm:[&_td:first-child:not([colspan])]:py-3.5",
);

/** Timestamps and addresses are technical values: JetBrains Mono, one size down. */
const MONO = "font-mono text-[12px] tracking-normal";

/*
 * Two cards share a row on a phone, so they step down there: a shorter field,
 * tighter padding and a smaller number (the values here are short counts).
 */
const STAT_GRID = "mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4";
const STAT_COMPACT =
  "max-sm:min-h-[140px] max-sm:rounded-[22px] max-sm:p-4 max-sm:[&_p.font-display]:text-[28px]";

/** Some events carry their own key as the message; that line would only repeat the title. */
function eventDetail(e: SecurityEvent) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, " ");
  return e.message && norm(e.message) !== norm(e.kind) ? e.message : null;
}

const STAT_LABELS = ["Failed logins (24h)", "Locked accounts", "Suspicious logins (24h)", "Blocked IPs"] as const;
const STAT_ICONS = [ShieldAlert, Lock, ShieldAlert, ShieldCheck] as const;

export default function SecurityPage() {
  const { data: overview, isFetching: ovLoading } = useGetSecurityOverviewQuery();
  const [page, setPage] = useState(0);
  const { data: events, isFetching: evLoading } = useListSecurityEventsQuery({ page, size: 20 });
  const [blockIp] = useBlockIpMutation();

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ipAddress: "", reason: "" });
  const [blocking, setBlocking] = useState(false);

  const submitBlock = async () => {
    if (!blockForm.ipAddress.trim()) return toast.error("IP is required");
    setBlocking(true);
    try {
      await blockIp({ ipAddress: blockForm.ipAddress.trim(), reason: blockForm.reason.trim() || undefined }).unwrap();
      toast.success("IP blocked");
      setBlockOpen(false);
      setBlockForm({ ipAddress: "", reason: "" });
    } catch {
      toast.error("Could not block IP");
    } finally {
      setBlocking(false);
    }
  };

  const columns = useMemo<ColumnDef<SecurityEvent>[]>(
    () => [
      {
        header: "When",
        cell: ({ row }) => (
          <>
            <time dateTime={row.original.occurredAt} className={cn(MONO, "whitespace-nowrap text-ink-2 max-sm:hidden")}>
              {new Date(row.original.occurredAt).toLocaleString()}
            </time>
            <EventCard event={row.original} />
          </>
        ),
      },
      {
        header: "Event",
        cell: ({ row }) => {
          const detail = eventDetail(row.original);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <EventIcon event={row.original} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{formatEnum(row.original.kind)}</p>
                {detail && <p className="max-w-[320px] truncate text-[12.5px] text-ink-3">{detail}</p>}
              </div>
            </div>
          );
        },
      },
      {
        header: "Severity",
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        header: "Actor",
        // Wide enough for the whole of a long address (the smoke accounts
        // differ only in their last characters); anything longer ends in an
        // ellipsis with the full address as the tooltip.
        cell: ({ row }) => (
          <span title={row.original.actorEmail} className="block max-w-[320px] truncate text-[13px] text-ink-2">
            {row.original.actorEmail ?? "—"}
          </span>
        ),
      },
      {
        header: "IP",
        cell: ({ row }) => (
          <span className={cn(MONO, "whitespace-nowrap text-ink-3")}>
            <IpText event={row.original} />
          </span>
        ),
      },
    ],
    [],
  );

  // Bars in "Top offenders" are drawn against the loudest source.
  const maxHits = Math.max(1, ...(overview?.topOffendingIps.map((ip) => ip.count) ?? []));

  return (
    <>
      <PageHeader
        title="Security"
        description="Authentication anomalies, lockouts, blocked IPs and recent events."
        actions={
          // A quiet pill: it only opens the dialog, whose confirm button is the red one.
          <Button variant="secondary" leftIcon={<Ban className="size-4 text-danger" />} onClick={() => setBlockOpen(true)}>
            Block IP
          </Button>
        }
      />

      {ovLoading && !overview ? (
        <div className={STAT_GRID} aria-busy>
          {STAT_LABELS.map((label, i) => (
            <StatCard key={label} label={label} value="" Icon={STAT_ICONS[i]} loading className={STAT_COMPACT} />
          ))}
        </div>
      ) : overview ? (
        // Colours carry meaning here, so each card names its family rather than
        // rotating: red when a number is an alarm, green when all is quiet.
        <div className={STAT_GRID}>
          <StatCard
            label="Failed logins (24h)"
            value={overview.failedLoginsLast24h.toLocaleString()}
            Icon={ShieldAlert}
            hue={overview.failedLoginsLast24h > 100 ? "k-trans" : "k-eng"}
            className={STAT_COMPACT}
          />
          <StatCard
            label="Locked accounts"
            value={overview.lockedAccounts.toLocaleString()}
            Icon={Lock}
            hue="k-biz"
            className={STAT_COMPACT}
          />
          <StatCard
            label="Suspicious logins (24h)"
            value={overview.suspiciousLoginsLast24h.toLocaleString()}
            Icon={ShieldAlert}
            hue={overview.suspiciousLoginsLast24h > 0 ? "k-trans" : "k-energy"}
            className={STAT_COMPACT}
          />
          <StatCard
            label="Blocked IPs"
            value={overview.blockedIps.toLocaleString()}
            Icon={ShieldCheck}
            hue="k-navy"
            className={STAT_COMPACT}
          />
        </div>
      ) : null}

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="offenders">Top offenders</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <DataTable<SecurityEvent>
            data={events?.content ?? []}
            columns={columns}
            isLoading={evLoading}
            emptyTitle="No events"
            pagination={events ? { page: events.page, size: events.size, totalElements: events.totalElements, totalPages: events.totalPages } : undefined}
            onPageChange={setPage}
            getRowId={(r) => String(r.id)}
            className={cn(LOG_DENSITY, MOBILE_STACK)}
          />
        </TabsContent>

        <TabsContent value="offenders">
          <Card>
            <CardHeader>
              <CardTitle>Top offending IPs</CardTitle>
              <CardDescription>Most frequent sources of failed / suspicious activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {!overview || overview.topOffendingIps.length === 0 ? (
                <SoftEmpty icon={<ShieldCheck />} title="Nothing flagged." />
              ) : (
                <ul className="divide-y divide-line">
                  {overview.topOffendingIps.map((ip, i) => (
                    <li key={ip.ipAddress} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0 sm:gap-4">
                      {/* The rank tile gives way on a phone so the address keeps its room. */}
                      <span
                        aria-hidden
                        className="hidden size-9 shrink-0 place-items-center rounded-full bg-danger-tint font-mono text-[12px] font-semibold text-danger sm:grid"
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13.5px] font-semibold tracking-normal text-ink">{ip.ipAddress}</p>
                        <p className="text-[12.5px] text-ink-3">{ip.countryCode ?? "Unknown country"}</p>
                      </div>
                      {/* Share of the loudest source — decoration for scanning, the count beside it is the value. */}
                      <div aria-hidden className="hbar hidden w-32 shrink-0 md:block lg:w-48">
                        <i
                          className="block h-full rounded-full bg-danger"
                          style={{ width: `${Math.max(4, (ip.count / maxHits) * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-danger">
                        <span className="font-mono tracking-normal">{ip.count}</span> hits
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 text-danger"
                        leftIcon={<Ban className="size-4" />}
                        onClick={() => { setBlockForm({ ipAddress: ip.ipAddress, reason: "Top offender" }); setBlockOpen(true); }}
                      >
                        Block
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<Ban />} iconTone="danger">
            <DialogTitle>Block IP address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ip" required>IP address</Label>
              <Input
                id="ip"
                placeholder="203.0.113.42"
                className="font-mono tracking-normal"
                value={blockForm.ipAddress}
                onChange={(e) => setBlockForm({ ...blockForm, ipAddress: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Optional internal note…"
                value={blockForm.reason}
                onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBlockOpen(false)} disabled={blocking}>Cancel</Button>
            <Button variant="danger" leftIcon={<Ban className="size-4" />} loading={blocking} onClick={submitBlock}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The event's icon on a round tile tinted like its severity. */
function EventIcon({ event: e }: { event: SecurityEvent }) {
  const Icon = KIND_ICON[e.kind] ?? ShieldAlert;
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full", SEVERITY_TILE[e.severity])}>
      <Icon className="size-4" />
    </span>
  );
}

function SeverityBadge({ severity, className }: { severity: SecuritySeverity; className?: string }) {
  return (
    <Badge tone={SEVERITY_TONE[severity]} size="sm" dot className={className}>
      {formatEnum(severity)}
    </Badge>
  );
}

function IpText({ event: e }: { event: SecurityEvent }) {
  return (
    <>
      {e.ipAddress ?? "—"}
      {e.countryCode ? ` · ${e.countryCode}` : ""}
    </>
  );
}

/**
 * One event as a phone card (hidden from sm up, where the columns show):
 * icon, title with the severity pill beside it, the detail line, the time in
 * mono, then actor · IP as a meta row.
 */
function EventCard({ event: e }: { event: SecurityEvent }) {
  const detail = eventDetail(e);
  return (
    <div className="flex min-w-0 gap-3 sm:hidden">
      <EventIcon event={e} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 pt-px text-[13.5px] font-semibold leading-snug text-ink">{formatEnum(e.kind)}</p>
          <SeverityBadge severity={e.severity} className="mt-0.5 shrink-0" />
        </div>
        {detail && <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{detail}</p>}
        <time dateTime={e.occurredAt} className={cn(MONO, "mt-1.5 block truncate text-ink-2")}>
          {new Date(e.occurredAt).toLocaleString()}
        </time>
        {/* The actor on its own line, whole (it wraps rather than cutting off
            the characters that tell two accounts apart), then the IP. */}
        <p className="mt-1 text-[12.5px] leading-snug text-ink-3 [overflow-wrap:anywhere]">{e.actorEmail ?? "—"}</p>
        <p className={cn(MONO, "mt-0.5 truncate text-ink-3")}>
          <IpText event={e} />
        </p>
      </div>
    </div>
  );
}
