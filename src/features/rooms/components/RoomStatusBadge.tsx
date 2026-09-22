import { Badge } from "@shared/components/ui/Badge";
import { cn } from "@shared/lib/cn";
import { ROOM_STATUS, type RoomStatus } from "@shared/types/lms";

const MAP: Record<RoomStatus, { tone: "success" | "warning" | "brand" | "neutral"; label: string }> = {
  [ROOM_STATUS.AVAILABLE]: { tone: "success", label: "Available" },
  [ROOM_STATUS.MAINTENANCE]: { tone: "warning", label: "Maintenance" },
  [ROOM_STATUS.RESERVED]: { tone: "brand", label: "Reserved" },
  [ROOM_STATUS.RETIRED]: { tone: "neutral", label: "Retired" },
};

/**
 * Room status as a Bright pill with a dot. `glass` is for sitting on a cover
 * (a photo or the generated plan): a frosted surface keeps the status colour
 * readable over any picture.
 */
export function RoomStatusBadge({
  status,
  glass,
  className,
}: {
  status: RoomStatus;
  glass?: boolean;
  className?: string;
}) {
  const m = MAP[status];
  return (
    <Badge
      tone={m.tone}
      dot
      className={cn(glass && "pill-glass bg-surface/90", className)}
    >
      {m.label}
    </Badge>
  );
}
