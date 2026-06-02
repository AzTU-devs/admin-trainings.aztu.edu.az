export type ServiceState = "UP" | "DEGRADED" | "DOWN";

export interface SystemHealth {
  uptimeSeconds: number;
  cpuUsagePct: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  appVersion: string;
  environment: string;
  build?: string;
  services: ServiceStatus[];
  recentIncidents: SystemIncident[];
}

export interface ServiceStatus {
  name: string;
  state: ServiceState;
  latencyMs?: number;
  message?: string;
}

export interface SystemIncident {
  id: number;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  startedAt: string;
  resolvedAt?: string;
}
