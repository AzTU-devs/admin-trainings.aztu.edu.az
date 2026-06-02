import { Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
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
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { useGetSystemHealthQuery } from "@features/system-monitoring/api/systemApi";
import type { ServiceState, SystemIncident } from "@features/system-monitoring/types";
import { cn } from "@shared/lib/cn";

const STATE_TONE: Record<ServiceState, "success" | "warning" | "danger"> = {
  UP: "success",
  DEGRADED: "warning",
  DOWN: "danger",
};

const SEVERITY_TONE: Record<SystemIncident["severity"], "neutral" | "warning" | "danger" | "brand"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemMonitoringPage() {
  const { data, isFetching, error, refetch } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 15_000,
  });

  return (
    <>
      <PageHeader
        title="System monitoring"
        description="Live health of the AzTU Portal infrastructure. Auto-refreshes every 15s."
      />

      {isFetching && !data ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error || !data ? (
        <EmptyState
          title="Health data unavailable"
          description="The monitoring endpoint did not respond. Check the backend status."
          action={<button onClick={() => refetch()} className="text-sm font-medium text-brand-700 hover:underline">Retry</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Uptime"
              value={formatUptime(data.uptimeSeconds)}
              delta={data.environment + (data.build ? ` · ${data.build}` : "")}
              Icon={Server}
              accent="brand"
            />
            <StatCard
              label="CPU"
              value={`${data.cpuUsagePct.toFixed(0)}%`}
              delta={data.cpuUsagePct > 85 ? "Over threshold" : "Within normal range"}
              deltaTone={data.cpuUsagePct > 85 ? "down" : "neutral"}
              Icon={Cpu}
              accent={data.cpuUsagePct > 85 ? "danger" : "success"}
            />
            <StatCard
              label="Memory"
              value={`${(data.memoryUsedMb / 1024).toFixed(1)} / ${(data.memoryTotalMb / 1024).toFixed(1)} GB`}
              delta={`${((data.memoryUsedMb / data.memoryTotalMb) * 100).toFixed(0)}% in use`}
              Icon={MemoryStick}
              accent="gold"
            />
            <StatCard
              label="Disk"
              value={`${data.diskUsedGb.toFixed(0)} / ${data.diskTotalGb.toFixed(0)} GB`}
              delta={`${((data.diskUsedGb / data.diskTotalGb) * 100).toFixed(0)}% in use`}
              Icon={HardDrive}
              accent="warning"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Service status</CardTitle>
                <CardDescription>Health of upstream dependencies (DB, cache, queue, storage…).</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.services.length === 0 && <p className="text-sm text-gray-500">No services reported.</p>}
                  {data.services.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                        {s.message && <p className="text-xs text-gray-500 truncate">{s.message}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.latencyMs !== undefined && (
                          <span className="text-xs font-mono text-gray-500">{s.latencyMs} ms</span>
                        )}
                        <Badge tone={STATE_TONE[s.state]} dot>{s.state}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent incidents</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data.recentIncidents.length === 0 && <p className="text-sm text-gray-500">No incidents — quiet skies.</p>}
                  {data.recentIncidents.map((i) => (
                    <li key={i.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{i.title}</p>
                        <Badge tone={SEVERITY_TONE[i.severity]}>{i.severity}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(i.startedAt).toLocaleString()}
                        {i.resolvedAt ? ` · resolved` : (
                          <span className={cn("ml-1 font-medium", i.state === "OPEN" ? "text-error-600" : "text-warning-600")}>
                            · {i.state}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
