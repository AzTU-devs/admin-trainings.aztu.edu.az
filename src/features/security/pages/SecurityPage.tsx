import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Ban, Lock, ShieldAlert, ShieldCheck, Unlock } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Label } from "@shared/components/ui/Label";
import { Spinner } from "@shared/components/ui/Spinner";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { apiErrorMessage, toNormalizedError } from "@shared/lib/apiError";
import { useAuth } from "@features/auth/hooks/useAuth";
import {
  useBlockIpMutation,
  useGetSecurityOverviewQuery,
  useListBlockedIpsQuery,
  useListSecurityEventsQuery,
  useUnblockIpMutation,
} from "@features/security/api/securityApi";
import { isValidIp } from "@features/security/lib/ip";
import { enumLabel } from "@shared/constants/enumLabels";
import type {
  BlockedIp,
  SecurityEvent,
  SecuritySeverity,
} from "@features/security/types";

const SEVERITY_TONE: Record<SecuritySeverity, "neutral" | "warning" | "danger" | "brand"> = {
  INFO: "neutral",
  LOW: "brand",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

export default function SecurityPage() {
  const { user } = useAuth();
  const overviewQ = useGetSecurityOverviewQuery();
  const overview = overviewQ.currentData;
  const [page, setPage] = useState(0);
  const eventsQ = useListSecurityEventsQuery({ page, size: 20 });
  const events = eventsQ.currentData;
  const blockedQ = useListBlockedIpsQuery();
  const [blockIp] = useBlockIpMutation();
  const [unblockIp] = useUnblockIpMutation();

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ipAddress: "", reason: "" });
  const [ipError, setIpError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [toUnblock, setToUnblock] = useState<BlockedIp | null>(null);

  /**
   * Addresses the signed-in super admin's own recent events came from. Behind
   * the campus NAT the university's shared address is naturally the top
   * offender, and it is also the super admin's own — blocking it locks
   * everyone out, including the only person who could undo it.
   */
  const myIps = useMemo(() => {
    const mine = new Set<string>();
    for (const e of events?.content ?? []) {
      if (e.ipAddress && user?.email && e.actorEmail?.toLowerCase() === user.email.toLowerCase()) {
        mine.add(e.ipAddress);
      }
    }
    return mine;
  }, [events, user?.email]);

  const openBlock = (ipAddress = "", reason = "") => {
    setBlockForm({ ipAddress, reason });
    setIpError(null);
    setBlockOpen(true);
  };

  const submitBlock = async () => {
    const ip = blockForm.ipAddress.trim();
    if (!isValidIp(ip)) {
      setIpError("Enter a single IPv4 or IPv6 address, e.g. 203.0.113.42 (no ranges or hostnames).");
      return;
    }
    setBlocking(true);
    try {
      await blockIp({ ipAddress: ip, reason: blockForm.reason.trim() || undefined }).unwrap();
      toast.success(`${ip} blocked`);
      setBlockOpen(false);
      setBlockForm({ ipAddress: "", reason: "" });
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not block the IP"));
    } finally {
      setBlocking(false);
    }
  };

  const columns = useMemo<ColumnDef<SecurityEvent>[]>(
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
        header: "Event",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{enumLabel("securityEventKind", row.original.kind)}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.message}</p>
          </div>
        ),
      },
      {
        header: "Severity",
        cell: ({ row }) => <Badge tone={SEVERITY_TONE[row.original.severity] ?? "neutral"} dot>{enumLabel("severity", row.original.severity)}</Badge>,
      },
      {
        header: "Actor",
        cell: ({ row }) => (
          <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] block">
            {row.original.actorEmail ?? "—"}
          </span>
        ),
      },
      {
        header: "IP",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-gray-500">
            {row.original.ipAddress ?? "—"}{row.original.countryCode ? ` · ${row.original.countryCode}` : ""}
          </span>
        ),
      },
    ],
    [],
  );

  const blockedColumns = useMemo<ColumnDef<BlockedIp>[]>(
    () => [
      {
        header: "Address",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-900 dark:text-white">{row.original.ipAddress}</span>
        ),
      },
      { header: "Reason", cell: ({ row }) => <span className="text-sm">{row.original.reason || "—"}</span> },
      {
        header: "Blocked",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : "—"}
            {row.original.createdByEmail ? ` · ${row.original.createdByEmail}` : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Unlock className="size-4" />}
              onClick={() => setToUnblock(row.original)}
            >
              Unblock
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // A 404 here means the API predates the list endpoint, which is not an error
  // the super admin can do anything about — say what is missing instead.
  const blockedListMissing = blockedQ.isError && toNormalizedError(blockedQ.error).status === 404;
  const targetIsMine = myIps.has(blockForm.ipAddress.trim());

  return (
    <>
      <PageHeader
        title="Security"
        description="Authentication anomalies, lockouts, blocked IPs and recent events."
        actions={
          <Button variant="danger" leftIcon={<Ban className="size-4" />} onClick={() => openBlock()}>
            Block IP
          </Button>
        }
      />

      {overviewQ.isFetching && !overview ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : overviewQ.isError ? (
        <QueryErrorState error={overviewQ.error} onRetry={overviewQ.refetch} what="the security overview" className="mb-6" />
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Failed logins (24h)"
            value={overview.failedLoginsLast24h.toLocaleString()}
            Icon={ShieldAlert}
            accent={overview.failedLoginsLast24h > 100 ? "danger" : "warning"}
          />
          <StatCard
            label="Locked accounts"
            value={overview.lockedAccounts.toLocaleString()}
            Icon={Lock}
            accent="warning"
          />
          <StatCard
            label="Suspicious logins (24h)"
            value={overview.suspiciousLoginsLast24h.toLocaleString()}
            Icon={ShieldAlert}
            accent={overview.suspiciousLoginsLast24h > 0 ? "danger" : "success"}
          />
          <StatCard
            label="Blocked IPs"
            value={overview.blockedIps.toLocaleString()}
            Icon={ShieldCheck}
            accent="brand"
          />
        </div>
      ) : null}

      <Tabs defaultValue="events">
        <TabsList className="mb-4">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="offenders">Top offenders</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <DataTable<SecurityEvent>
            data={events?.content ?? []}
            columns={columns}
            isLoading={eventsQ.isFetching && !events}
            isError={eventsQ.isError}
            error={eventsQ.error}
            onRetry={eventsQ.refetch}
            errorWhat="security events"
            emptyTitle="No events"
            pagination={events ? { page: events.page, size: events.size, totalElements: events.totalElements, totalPages: events.totalPages } : undefined}
            onPageChange={setPage}
            getRowId={(r) => String(r.id)}
          />
        </TabsContent>

        <TabsContent value="offenders">
          <Card>
            <CardHeader>
              <CardTitle>Top offending IPs</CardTitle>
              <CardDescription>
                Most frequent sources of failed / suspicious activity. A shared campus or office
                address naturally ranks high here — check before blocking it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!overview || overview.topOffendingIps.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing flagged.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {overview.topOffendingIps.map((ip) => (
                    <li key={ip.ipAddress} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {ip.ipAddress}
                          {myIps.has(ip.ipAddress) && (
                            <Badge tone="warning" className="ml-2">Your address</Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{ip.countryCode ?? "Unknown country"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-error-600 dark:text-error-400">{ip.count} hits</span>
                        {/* Opens the confirmation dialog — never blocks in one click. */}
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Ban className="size-4" />}
                          onClick={() => openBlock(ip.ipAddress, "Top offender")}
                        >
                          Block…
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          {blockedListMissing ? (
            <Card>
              <CardContent className="pt-5 text-sm text-gray-600 dark:text-gray-300">
                This API version cannot list blocked addresses yet, so they can't be reviewed or
                unblocked from here. Update the API to manage the block list.
              </CardContent>
            </Card>
          ) : (
            <DataTable<BlockedIp>
              data={blockedQ.currentData ?? []}
              columns={blockedColumns}
              isLoading={blockedQ.isFetching && !blockedQ.currentData}
              isError={blockedQ.isError}
              error={blockedQ.error}
              onRetry={blockedQ.refetch}
              errorWhat="blocked IPs"
              emptyTitle="No blocked IPs"
              emptyDescription="Addresses you block appear here, where they can be unblocked."
              getRowId={(r) => r.id}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={blockOpen} onOpenChange={(o) => !blocking && setBlockOpen(o)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Block IP address</DialogTitle>
            <DialogDescription>
              Every request from this address is refused, starting immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2.5 rounded-xl bg-warning-50 dark:bg-warning-500/10 p-3 text-sm text-warning-800 dark:text-warning-200">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <p>
                Everyone sharing this address — a campus or office network behind NAT, a mobile
                carrier — loses access at once, including you if you are on it.
              </p>
            </div>
            {targetIsMine && (
              <p role="alert" className="rounded-xl bg-error-50 dark:bg-error-500/10 p-3 text-sm font-medium text-error-700 dark:text-error-300">
                Your own recent activity came from this address. Blocking it will lock you out of the
                portal too.
              </p>
            )}
            <div>
              <Label htmlFor="ip" required>IP address</Label>
              <Input
                id="ip"
                placeholder="203.0.113.42"
                value={blockForm.ipAddress}
                invalid={!!ipError}
                onChange={(e) => {
                  setIpError(null);
                  setBlockForm({ ...blockForm, ipAddress: e.target.value });
                }}
              />
              {ipError && <p role="alert" className="mt-1 text-xs text-error-600">{ipError}</p>}
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
              Block address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toUnblock}
        onOpenChange={(o) => !o && setToUnblock(null)}
        title={`Unblock ${toUnblock?.ipAddress ?? ""}?`}
        description="Requests from this address are accepted again immediately."
        confirmLabel="Unblock"
        onConfirm={async () => {
          if (!toUnblock) return;
          // Rejections are shown by ConfirmDialog, which keeps the dialog open.
          await unblockIp(toUnblock.id).unwrap();
          toast.success(`${toUnblock.ipAddress} unblocked`);
        }}
      />
    </>
  );
}
