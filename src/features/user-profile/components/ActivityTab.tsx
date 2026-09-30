import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MonitorSmartphone, ScrollText, ShieldAlert } from "lucide-react";
import { SoftEmpty } from "@shared/components/bright";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { cn } from "@shared/lib/cn";
import { formatEnum } from "@shared/lib/enums";
import { ProfileSection, Value } from "@features/user-profile/components/ProfileBits";
import { detailEntries, formatDateTime } from "@features/user-profile/lib/format";
import type {
  ProfileActivity,
  ProfileAuditEntry,
  ProfileSecurityEvent,
  ProfileSession,
} from "@features/user-profile/types";

/** Timestamps, ids and addresses are technical values: JetBrains Mono, one size down (as on Security). */
const MONO = "font-mono text-[12px] tracking-normal";

/** A log is read by scanning, so its rows sit a little tighter than the default table. */
const LOG_DENSITY = "[&_td:not([colspan])]:py-2.5";

/** Where a request came from: the IP in mono. */
function Ip({ value }: { value: string | null }) {
  return value ? <span className={cn(MONO, "whitespace-nowrap text-ink-2")}>{value}</span> : <Value />;
}

/** A browser's user-agent string, cut to the cell with the whole string on hover. */
function UserAgent({ value, className }: { value: string | null; className?: string }) {
  if (!value) return <Value />;
  return (
    <span title={value} className={cn("block max-w-[18rem] truncate text-[12.5px] text-ink-3", className)}>
      {value}
    </span>
  );
}

function When({ iso, className }: { iso: string | null; className?: string }) {
  if (!iso) return <Value />;
  return (
    <time dateTime={iso} className={cn(MONO, "whitespace-nowrap text-ink-2", className)}>
      {formatDateTime(iso)}
    </time>
  );
}

/* ---------- Sessions ---------- */

function SessionState({ session: s }: { session: ProfileSession }) {
  if (s.active) {
    return (
      <Badge tone="success" size="sm" dot>
        Active
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" size="sm" dot>
      {s.revokedAt ? "Revoked" : "Expired"}
    </Badge>
  );
}

function Revoked({ session: s }: { session: ProfileSession }) {
  if (!s.revokedAt) return <Value />;
  return (
    <span className="block leading-snug">
      <When iso={s.revokedAt} />
      {s.revokeReason && <span className="mt-0.5 block text-[12.5px] text-ink-3">{formatEnum(s.revokeReason)}</span>}
    </span>
  );
}

const SESSION_COLUMNS: ColumnDef<ProfileSession>[] = [
  { header: "State", cell: ({ row }) => <SessionState session={row.original} /> },
  { header: "IP", cell: ({ row }) => <Ip value={row.original.ipAddress} /> },
  { header: "Device", cell: ({ row }) => <UserAgent value={row.original.userAgent} /> },
  { header: "Issued", cell: ({ row }) => <When iso={row.original.issuedAt} /> },
  { header: "Expires", cell: ({ row }) => <When iso={row.original.expiresAt} /> },
  { header: "Revoked", cell: ({ row }) => <Revoked session={row.original} /> },
];

function SessionPhoneRow({ session: s }: { session: ProfileSession }) {
  return (
    <div className="space-y-1.5 text-[13px]">
      <div className="flex items-center justify-between gap-3">
        <SessionState session={s} />
        <Ip value={s.ipAddress} />
      </div>
      <UserAgent value={s.userAgent} className="max-w-full" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12.5px]">
        <dt className="text-ink-3">Issued</dt>
        <dd><When iso={s.issuedAt} /></dd>
        <dt className="text-ink-3">Expires</dt>
        <dd><When iso={s.expiresAt} /></dd>
        {s.revokedAt && (
          <>
            <dt className="text-ink-3">Revoked</dt>
            <dd><Revoked session={s} /></dd>
          </>
        )}
      </dl>
    </div>
  );
}

/* ---------- Security events ---------- */

/** The event's detail as compact `key: value` pairs; the full JSON is the tooltip. */
function EventDetail({ detail }: { detail: ProfileSecurityEvent["detail"] }) {
  const entries = detailEntries(detail);
  if (entries.length === 0) return null;
  return (
    <p
      title={JSON.stringify(detail)}
      className="mt-0.5 max-w-[34rem] break-words text-[12.5px] leading-snug text-ink-3"
    >
      {entries.map(([key, value], i) => (
        <span key={key}>
          {i > 0 && <span aria-hidden> · </span>}
          <span className="font-medium text-ink-2">{key}:</span> <span className={MONO}>{value}</span>
        </span>
      ))}
    </p>
  );
}

function EventTitle({ event: e }: { event: ProfileSecurityEvent }) {
  return (
    <div className="min-w-0">
      <p className="text-[13.5px] font-semibold text-ink">{formatEnum(e.eventType)}</p>
      <EventDetail detail={e.detail} />
    </div>
  );
}

const EVENT_COLUMNS: ColumnDef<ProfileSecurityEvent>[] = [
  { header: "When", cell: ({ row }) => <When iso={row.original.occurredAt} /> },
  { header: "Event", cell: ({ row }) => <EventTitle event={row.original} /> },
  { header: "IP", cell: ({ row }) => <Ip value={row.original.ipAddress} /> },
  { header: "Device", cell: ({ row }) => <UserAgent value={row.original.userAgent} /> },
];

function EventPhoneRow({ event: e }: { event: ProfileSecurityEvent }) {
  return (
    <div className="space-y-1.5">
      <EventTitle event={e} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <When iso={e.occurredAt} />
        <Ip value={e.ipAddress} />
      </div>
      <UserAgent value={e.userAgent} className="max-w-full" />
    </div>
  );
}

/* ---------- Audit trail ---------- */

/** The action in its tone where it has an obvious one ("Delete" red), neutral otherwise. */
const ACTION_TONE: Record<string, "brand" | "warning" | "danger" | "success" | "neutral"> = {
  CREATE: "brand",
  UPDATE: "warning",
  DELETE: "danger",
  APPROVE: "success",
  REJECT: "danger",
  PUBLISH: "success",
};

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge tone={ACTION_TONE[action] ?? "neutral"} size="sm" dot>
      {formatEnum(action)}
    </Badge>
  );
}

/** `TYPE#id` in mono, the id cut to eight characters with the whole of it on hover. */
function EntityRef({ entry: a }: { entry: ProfileAuditEntry }) {
  return (
    <code className={cn(MONO, "whitespace-nowrap")}>
      <span className="font-semibold text-ink">{a.entityType}</span>
      {a.entityId && (
        <span title={a.entityId} className="text-ink-3">
          #{a.entityId.slice(0, 8)}
        </span>
      )}
    </code>
  );
}

/** Who did it: this user themselves, or another account by role and short id. */
function Actor({ entry: a, userId }: { entry: ProfileAuditEntry; userId: string }) {
  if (!a.actorId) return <span className="text-ink-3">{a.actorRole ? formatEnum(a.actorRole) : "System"}</span>;
  if (a.actorId === userId) return <span className="font-medium text-ink">This user</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink-2">{a.actorRole ? formatEnum(a.actorRole) : "Someone else"}</span>{" "}
      <span title={a.actorId} className={cn(MONO, "text-ink-3")}>
        #{a.actorId.slice(0, 8)}
      </span>
    </span>
  );
}

function auditColumns(userId: string): ColumnDef<ProfileAuditEntry>[] {
  return [
    { header: "When", cell: ({ row }) => <When iso={row.original.occurredAt} /> },
    { header: "Action", cell: ({ row }) => <ActionBadge action={row.original.action} /> },
    { header: "Entity", cell: ({ row }) => <EntityRef entry={row.original} /> },
    { header: "Actor", cell: ({ row }) => <Actor entry={row.original} userId={userId} /> },
    { header: "IP", cell: ({ row }) => <Ip value={row.original.ipAddress} /> },
  ];
}

function AuditPhoneRow({ entry: a, userId }: { entry: ProfileAuditEntry; userId: string }) {
  return (
    <div className="space-y-1.5 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActionBadge action={a.action} />
        <When iso={a.occurredAt} />
      </div>
      <EntityRef entry={a} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Actor entry={a} userId={userId} />
        <Ip value={a.ipAddress} />
      </div>
    </div>
  );
}

/**
 * How the account has been used and handled: its sign-in sessions, the
 * security events logged against it, and the audit trail of what it did and
 * what was done to it. The API sends the newest 20 sessions and the newest 50
 * events and audit rows.
 */
export function ActivityTab({ activity, userId }: { activity: ProfileActivity; userId: string }) {
  const active = activity.sessions.filter((s) => s.active).length;
  const auditCols = useMemo(() => auditColumns(userId), [userId]);
  return (
    <div className="space-y-8">
      <ProfileSection
        title="Sessions"
        count={activity.sessions.length}
        description={
          activity.sessions.length > 0
            ? `${active.toLocaleString()} active now. Up to the newest 20 are listed.`
            : undefined
        }
      >
        {activity.sessions.length === 0 ? (
          <SoftEmpty icon={<MonitorSmartphone />} title="No sessions on record." />
        ) : (
          <DataTable<ProfileSession>
            data={activity.sessions}
            columns={SESSION_COLUMNS}
            getRowId={(s) => s.id}
            renderMobileRow={(s) => <SessionPhoneRow session={s} />}
            className={LOG_DENSITY}
          />
        )}
      </ProfileSection>

      <ProfileSection
        title="Security events"
        count={activity.securityEvents.length}
        description={activity.securityEvents.length > 0 ? "Up to the newest 50 are listed." : undefined}
      >
        {activity.securityEvents.length === 0 ? (
          <SoftEmpty icon={<ShieldAlert />} title="No security events." />
        ) : (
          <DataTable<ProfileSecurityEvent>
            data={activity.securityEvents}
            columns={EVENT_COLUMNS}
            getRowId={(e) => e.id}
            renderMobileRow={(e) => <EventPhoneRow event={e} />}
            className={LOG_DENSITY}
          />
        )}
      </ProfileSection>

      <ProfileSection
        title="Audit trail"
        count={activity.auditTrail.length}
        description="What this user did, and what was done to their account. Up to the newest 50 are listed."
      >
        {activity.auditTrail.length === 0 ? (
          <SoftEmpty icon={<ScrollText />} title="No audit entries." />
        ) : (
          <DataTable<ProfileAuditEntry>
            data={activity.auditTrail}
            columns={auditCols}
            getRowId={(a) => a.id}
            renderMobileRow={(a) => <AuditPhoneRow entry={a} userId={userId} />}
            className={LOG_DENSITY}
          />
        )}
      </ProfileSection>
    </div>
  );
}
