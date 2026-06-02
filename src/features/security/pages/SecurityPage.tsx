import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Label } from "@shared/components/ui/Label";
import { Spinner } from "@shared/components/ui/Spinner";
import {
  useBlockIpMutation,
  useGetSecurityOverviewQuery,
  useListSecurityEventsQuery,
} from "@features/security/api/securityApi";
import type {
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
          <span className="text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
            {new Date(row.original.occurredAt).toLocaleString()}
          </span>
        ),
      },
      {
        header: "Event",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.original.kind.replace(/_/g, " ")}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.message}</p>
          </div>
        ),
      },
      {
        header: "Severity",
        cell: ({ row }) => <Badge tone={SEVERITY_TONE[row.original.severity]} dot>{row.original.severity}</Badge>,
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

  return (
    <>
      <PageHeader
        title="Security"
        description="Authentication anomalies, lockouts, blocked IPs and recent events."
        actions={
          <Button variant="danger" leftIcon={<Ban className="size-4" />} onClick={() => setBlockOpen(true)}>
            Block IP
          </Button>
        }
      />

      {ovLoading && !overview ? (
        <div className="flex justify-center py-12"><Spinner /></div>
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
                <p className="text-sm text-gray-500">Nothing flagged.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {overview.topOffendingIps.map((ip) => (
                    <li key={ip.ipAddress} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">{ip.ipAddress}</p>
                        <p className="text-xs text-gray-500">{ip.countryCode ?? "Unknown country"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-error-600 dark:text-error-400">{ip.count} hits</span>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<Ban className="size-4" />}
                          onClick={() => { setBlockForm({ ipAddress: ip.ipAddress, reason: "Top offender" }); setBlockOpen(true); }}
                        >
                          Block
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Block IP address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ip" required>IP address</Label>
              <Input
                id="ip"
                placeholder="203.0.113.42"
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
