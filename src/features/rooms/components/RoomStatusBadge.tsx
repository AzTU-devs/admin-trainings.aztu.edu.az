import { Badge } from "@shared/components/ui/Badge";
import { ROOM_STATUS, type RoomStatus } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";

const TONE: Record<RoomStatus, "success" | "warning" | "brand" | "neutral"> = {
  [ROOM_STATUS.AVAILABLE]: "success",
  [ROOM_STATUS.MAINTENANCE]: "warning",
  [ROOM_STATUS.RESERVED]: "brand",
  [ROOM_STATUS.RETIRED]: "neutral",
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <Badge tone={TONE[status] ?? "neutral"} dot>{enumLabel("roomStatus", status)}</Badge>;
}
