export type SecurityEventKind =
  | "FAILED_LOGIN"
  | "LOCKOUT"
  | "PASSWORD_CHANGE"
  | "MFA_ENROLLED"
  | "MFA_REMOVED"
  | "TOKEN_REVOKED"
  | "SUSPICIOUS_LOGIN"
  | "RATE_LIMIT_TRIPPED"
  | "ROLE_CHANGED";

export type SecuritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityEvent {
  id: string;
  kind: SecurityEventKind;
  severity: SecuritySeverity;
  actorId?: string;
  actorEmail?: string;
  ipAddress?: string;
  countryCode?: string;
  userAgent?: string;
  message: string;
  occurredAt: string;
}

export interface SecurityOverview {
  failedLoginsLast24h: number;
  lockedAccounts: number;
  suspiciousLoginsLast24h: number;
  blockedIps: number;
  recentEvents: SecurityEvent[];
  topOffendingIps: { ipAddress: string; count: number; countryCode?: string }[];
}
