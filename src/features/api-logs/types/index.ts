export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface ApiLogEntry {
  id: string;
  method: HttpMethod;
  path: string;
  status: number;
  latencyMs: number;
  ipAddress?: string;
  userAgent?: string;
  actorId?: string;
  actorEmail?: string;
  requestId?: string;
  errorMessage?: string;
  responseBytes?: number;
  occurredAt: string;
}
