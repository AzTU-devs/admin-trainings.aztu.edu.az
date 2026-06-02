import { Badge } from "@shared/components/ui/Badge";
import { BOOKING_STATUS, type BookingStatus } from "@shared/types/lms";

const MAP: Record<BookingStatus, { tone: "warning" | "success" | "danger" | "neutral"; label: string }> = {
  [BOOKING_STATUS.PENDING]: { tone: "warning", label: "Pending" },
  [BOOKING_STATUS.APPROVED]: { tone: "success", label: "Approved" },
  [BOOKING_STATUS.REJECTED]: { tone: "danger", label: "Rejected" },
  [BOOKING_STATUS.CANCELLED]: { tone: "neutral", label: "Cancelled" },
};

export function RoomRequestStatusBadge({ status }: { status: BookingStatus }) {
  const m = MAP[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
