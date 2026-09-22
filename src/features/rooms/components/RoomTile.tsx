import { DoorOpen } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { roomHue } from "@features/rooms/lib/roomPlan";

/**
 * A room's colour tile — a door on the room's colour field — for rows that
 * name a room but do not carry its capacity or photos (bookings, analytics),
 * so the floor plan cannot be drawn. Keyed by the room id like RoomVisual and
 * the booking date tile, so a room keeps one colour on every page, the way
 * people keep their avatar colour. Decorative: the name always sits beside it.
 *
 *   <RoomTile roomId={b.roomId} />                      // 40px, table rows
 *   <RoomTile roomId={r.roomId} className="size-8 rounded-[10px]" />
 */
export function RoomTile({ roomId, className }: { roomId: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-[12px] bg-k-100 text-k-700",
        roomHue(roomId),
        className,
      )}
    >
      <DoorOpen className="size-[18px]" />
    </span>
  );
}
