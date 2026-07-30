export interface Student {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  activeEnrollments: number;
  totalEnrollments: number;
  averageProgressPct: number;
  lastActivityAt?: string;
}
