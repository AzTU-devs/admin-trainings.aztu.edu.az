import { Badge } from "@shared/components/ui/Badge";
import { BOOKING_STATUS, type BookingStatus } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";

const TONE: Record<BookingStatus, "warning" | "success" | "danger" | "neutral"> = {
  [BOOKING_STATUS.PENDING]: "warning",
  [BOOKING_STATUS.APPROVED]: "success",
  [BOOKING_STATUS.REJECTED]: "danger",
  [BOOKING_STATUS.CANCELLED]: "neutral",
};

export function RoomRequestStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONE[status] ?? "neutral"} dot>{enumLabel("bookingStatus", status)}</Badge>;
}
