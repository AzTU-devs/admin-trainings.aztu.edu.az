export interface Student {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  activeEnrollments: number;
  totalEnrollments: number;
  averageProgressPct: number;
  lastActivityAt?: string;
}
