export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "APPROVE"
  | "REJECT"
  | "PUBLISH"
  | "ARCHIVE"
  | "OTHER";

export interface AuditLogEntry {
  id: number;
  actorId: number;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | number;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  context?: Record<string, unknown>;
  occurredAt: string;
}
