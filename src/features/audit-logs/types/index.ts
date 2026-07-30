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
  id: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  context?: Record<string, unknown>;
  occurredAt: string;
}
