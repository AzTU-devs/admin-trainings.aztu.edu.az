import { Badge } from "@shared/components/ui/Badge";
import { ROOM_STATUS, type RoomStatus } from "@shared/types/lms";

const MAP: Record<RoomStatus, { tone: "success" | "warning" | "brand" | "neutral"; label: string }> = {
  [ROOM_STATUS.AVAILABLE]: { tone: "success", label: "Available" },
  [ROOM_STATUS.MAINTENANCE]: { tone: "warning", label: "Maintenance" },
  [ROOM_STATUS.RESERVED]: { tone: "brand", label: "Reserved" },
  [ROOM_STATUS.RETIRED]: { tone: "neutral", label: "Retired" },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const m = MAP[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
