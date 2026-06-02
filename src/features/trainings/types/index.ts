/**
 * Trainings have no dedicated backend controller yet. Offline delivery is
 * modeled on the backend as a Course with `courseType = OFFLINE` + offlineDetails.
 * See GAP_REPORT.md. These types are placeholders until a contract exists.
 */
import type { UUID } from "@shared/types/lms";

export interface Training {
  id: UUID;
  title: string;
}
