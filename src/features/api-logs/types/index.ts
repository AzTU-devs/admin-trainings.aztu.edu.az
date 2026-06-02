export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface ApiLogEntry {
  id: number;
  method: HttpMethod;
  path: string;
  status: number;
  latencyMs: number;
  ipAddress?: string;
  userAgent?: string;
  actorId?: number;
  actorEmail?: string;
  requestId?: string;
  errorMessage?: string;
  responseBytes?: number;
  occurredAt: string;
}
