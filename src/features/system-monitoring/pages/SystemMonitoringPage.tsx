import { useMemo } from "react";
import {
  Activity,
  Boxes,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  ListOrdered,
  Mail,
  MemoryStick,
  Server,
  ServerCrash,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { SoftEmpty, Svg } from "@shared/components/bright";
import { hash, tileSvg } from "@shared/lib/art";
import type { HueClass } from "@shared/lib/categoryStyle";
import { useGetSystemHealthQuery } from "@features/system-monitoring/api/systemApi";
import { HealthStat } from "@features/system-monitoring/components/HealthStat";
import type { ServiceState, ServiceStatus, SystemIncident } from "@features/system-monitoring/types";
import { cn } from "@shared/lib/cn";

const SEVERITY_TONE: Record<SystemIncident["severity"], "neutral" | "warning" | "danger" | "brand"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

/**
 * A service tile is a colour field in the family its state calls for: green
 * when up, yellow when degraded, red when down — so a wall of tiles reads as
 * a traffic light before a word of it is read.
 */
const STATE_HUE: Record<ServiceState, HueClass> = {
  UP: "k-energy",
  DEGRADED: "k-biz",
  DOWN: "k-trans",
};

/** Motifs for the tile corner, picked by service name so each tile keeps its own. */
const SERVICE_MOTIFS = ["circle", "rings", "blocks", "bars", "dots", "half"] as const;

/** A recognisable icon for the dependencies a backend usually reports; a pulse for the rest. */
function serviceIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/(db|database|postgres|mysql|sql|mongo)/.test(n)) return Database;
  if (/(cache|redis|memcache)/.test(n)) return Zap;
  if (/(queue|kafka|rabbit|amqp|broker)/.test(n)) return ListOrdered;
  if (/(storage|disk|s3|minio|file|media)/.test(n)) return HardDrive;
  if (/(mail|smtp|email)/.test(n)) return Mail;
  if (/(cdn|cloud|external|upstream)/.test(n)) return Cloud;
  if (/(app|api|server|backend|application)/.test(n)) return Server;
  if (/(worker|job|scheduler)/.test(n)) return Boxes;
  return Activity;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* Two readings per row on a phone too, as on Analytics, so the services are not ~650px down. */
const STAT_GRID = "mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4";

/** CPU turns red past 85% (the threshold it always had); memory and disk at 90%. */
const CPU_ALARM_PCT = 85;
const STORAGE_ALARM_PCT = 90;

export default function SystemMonitoringPage() {
  const { data, isFetching, error, refetch } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 15_000,
  });

  // Shares in use, worked out as before; they only pick the colour and the alarm sign.
  const memoryPct = data ? (data.memoryUsedMb / data.memoryTotalMb) * 100 : 0;
  const diskPct = data ? (data.diskUsedGb / data.diskTotalGb) * 100 : 0;
  const cpuAlarm = !!data && data.cpuUsagePct > CPU_ALARM_PCT;
  const memoryAlarm = memoryPct >= STORAGE_ALARM_PCT;
  const diskAlarm = diskPct >= STORAGE_ALARM_PCT;

  return (
    <>
      <PageHeader
        title="System monitoring"
        description="Live health of the AzTU Portal infrastructure. Auto-refreshes every 15s."
      />

      {isFetching && !data ? (
        // The tiles hold their place while the first reading loads.
        <div className={STAT_GRID} aria-busy>
          <HealthStat label="Uptime" value="" Icon={Server} hue="k-data" loading />
          <HealthStat label="CPU" value="" Icon={Cpu} hue="k-energy" loading />
          <HealthStat label="Memory" value="" Icon={MemoryStick} hue="k-gold" loading />
          <HealthStat label="Disk" value="" Icon={HardDrive} hue="k-eng" loading />
        </div>
      ) : error || !data ? (
        <EmptyState
          tone="danger"
          Icon={ServerCrash}
          title="Health data unavailable"
          description="The monitoring endpoint did not respond. Check the backend status."
          action={<Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <>
          {/* Each reading keeps its own family (blue, green, gold, orange) while
              it is normal; any reading past its threshold turns red and its
              line leads with a warning sign, so an alarm never looks like a
              calm reading. Sizes keep their unit (GB) beside the number. */}
          <div className={STAT_GRID}>
            <HealthStat
              label="Uptime"
              value={formatUptime(data.uptimeSeconds)}
              meta={data.environment + (data.build ? ` · ${data.build}` : "")}
              Icon={Server}
              hue="k-data"
            />
            <HealthStat
              label="CPU"
              value={`${data.cpuUsagePct.toFixed(0)}%`}
              meta={cpuAlarm ? "Over threshold" : "Within normal range"}
              alarm={cpuAlarm}
              Icon={Cpu}
              hue="k-energy"
            />
            <HealthStat
              label="Memory"
              value={`${(data.memoryUsedMb / 1024).toFixed(1)} / ${(data.memoryTotalMb / 1024).toFixed(1)}`}
              unit="GB"
              meta={`${memoryPct.toFixed(0)}% in use`}
              alarm={memoryAlarm}
              Icon={MemoryStick}
              hue="k-gold"
            />
            <HealthStat
              label="Disk"
              value={`${data.diskUsedGb.toFixed(0)} / ${data.diskTotalGb.toFixed(0)}`}
              unit="GB"
              meta={`${diskPct.toFixed(0)}% in use`}
              alarm={diskAlarm}
              Icon={HardDrive}
              hue="k-eng"
            />
          </div>

          {/* Side by side only from xl: below that the incidents column is too
              narrow for a sentence, so the two cards stack. */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Service status</CardTitle>
                <CardDescription>Health of upstream dependencies (DB, cache, queue, storage…).</CardDescription>
              </CardHeader>
              <CardContent>
                {data.services.length === 0 ? (
                  <SoftEmpty icon={<Activity />} title="No services reported." />
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.services.map((s) => <ServiceTile key={s.name} service={s} />)}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Recent incidents</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentIncidents.length === 0 ? (
                  <SoftEmpty icon={<ShieldCheck />} title="No incidents — quiet skies." />
                ) : (
                  <ul className="space-y-2.5">
                    {data.recentIncidents.map((i) => (
                      <li key={i.id} className="rounded-[18px] border border-line p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{i.title}</p>
                          <Badge tone={SEVERITY_TONE[i.severity]} size="sm">{i.severity}</Badge>
                        </div>
                        <p className="mt-1.5 text-[12.5px] text-ink-3">
                          <time dateTime={i.startedAt} className="font-mono text-[12px] tracking-normal">
                            {new Date(i.startedAt).toLocaleString()}
                          </time>
                          {i.resolvedAt ? ` · resolved` : (
                            <span className={cn("ml-1 font-semibold", i.state === "OPEN" ? "text-danger" : "text-warn")}>
                              · {i.state}
                            </span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/**
 * One dependency as a small status tile: the state's colour field, a motif
 * in the corner, the name in Albert Sans, the latency in mono and the state
 * as a pill that stays legible on the field.
 */
function ServiceTile({ service: s }: { service: ServiceStatus }) {
  const Icon = serviceIcon(s.name);
  const motif = useMemo(() => tileSvg(SERVICE_MOTIFS[hash(s.name) % SERVICE_MOTIFS.length]), [s.name]);

  return (
    <li
      className={cn(
        "relative isolate flex min-h-[124px] flex-col overflow-hidden rounded-[22px] bg-k-100 p-4 text-k-900",
        STATE_HUE[s.state],
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-5 -right-5 -z-10 size-24 opacity-90 [&_svg]:size-full">
        <Svg markup={motif} />
      </span>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-k-0 text-k-700 shadow-[0_1px_2px_oklch(0_0_0/0.06)]">
          <Icon className="size-[18px]" />
        </span>
        <Badge dot size="sm" className="bg-k-0 text-k-900">{s.state}</Badge>
      </div>
      <div className="mt-auto min-w-0 pr-14 pt-4">
        {/* Keys arrive lower-case ("database"); the first letter is capitalised
            in CSS so the text stays exactly as reported. */}
        <p className="truncate font-display text-[17px] font-bold leading-tight tracking-[-0.014em] first-letter:uppercase">
          {s.name}
        </p>
        {s.message && <p className="mt-0.5 truncate text-[12.5px] text-k-700">{s.message}</p>}
        {/* Always one latency line (a dash when none is reported) so the names
            of neighbouring tiles sit at the same height. */}
        <p className="mt-1 font-mono text-[12px] font-medium tracking-normal text-k-700">
          {typeof s.latencyMs === "number" ? `${s.latencyMs} ms` : "—"}
        </p>
      </div>
    </li>
  );
}
