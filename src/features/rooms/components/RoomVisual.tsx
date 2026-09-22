import { useMemo } from "react";
import { MediaImage } from "@shared/components/ui/MediaImage";
import { cn } from "@shared/lib/cn";
import { roomHue, roomPlan, type PlanShape } from "@features/rooms/lib/roomPlan";

function Shape({ s }: { s: PlanShape }) {
  return s.kind === "rect" ? (
    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} className={s.paint} />
  ) : (
    <circle cx={s.cx} cy={s.cy} r={s.r} className={s.paint} />
  );
}

/** The drafted floor plan (see lib/roomPlan). Decorative. */
export function RoomPlan({ seed, capacity, square }: { seed: string; capacity: number; square?: boolean }) {
  const g = useMemo(() => roomPlan(seed, capacity, square), [seed, capacity, square]);
  return (
    <svg
      viewBox={`0 0 ${g.w} ${g.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={g.w} height={g.h} className="f100" />
      <path className="grid" d={g.grid} />
      <Shape s={g.backdrop} />
      <rect x={g.floor.x} y={g.floor.y} width={g.floor.w} height={g.floor.h} rx={square ? 9 : 12} className="f0" />
      <path d={g.walls} className="s900 fnone rnd" strokeWidth={square ? 3 : 3.5} />
      <path d={g.doorLeaf} className="s900 rnd" strokeWidth={2} />
      <path d={g.doorSwing} className="dimline" strokeDasharray="3 4" />
      {g.windows.map((w, i) => (
        <Shape key={`w${i}`} s={w} />
      ))}
      <Shape s={g.board} />
      <Shape s={g.lectern} />
      {g.furniture.map((f, i) => (
        <Shape key={i} s={f} />
      ))}
      {g.dim ? (
        <>
          <path className="dimline" d={g.dim.path} />
          <text className="dim" x={g.dim.x} y={g.dim.y} textAnchor="middle">
            {g.dim.label}
          </text>
        </>
      ) : null}
    </svg>
  );
}

interface RoomVisualProps {
  room: { id: string; capacity: number; imageMediaIds?: string[] | null };
  /**
   * Square thumbnail for table rows and list items (44–64px): a compact plan
   * drawn for the square instead of a crop of the wide one.
   */
  thumb?: boolean;
  className?: string;
  /** Overlays on a wide cover: `<div className="ov left-3 top-3">…</div>`. */
  children?: React.ReactNode;
}

/**
 * A room's picture: its first photo when it has one, otherwise the generated
 * floor plan in the room's colour. Uses the website's `.cover` box, so a photo
 * gets the same top shade and category-style tab as a course photo.
 *
 *   <RoomVisual room={room} className="aspect-[16/10] w-full" />
 *   <RoomVisual room={room} thumb className="size-14 rounded-[16px]" />
 */
export function RoomVisual({ room, thumb, className, children }: RoomVisualProps) {
  const photoId = room.imageMediaIds?.[0];
  return (
    <div className={cn("cover", roomHue(room.id), photoId && !thumb && "photo", className)}>
      {photoId ? (
        <MediaImage mediaId={photoId} className="absolute inset-0 size-full object-cover" />
      ) : (
        <RoomPlan seed={room.id} capacity={room.capacity} square={thumb} />
      )}
      {children}
      {photoId && !thumb ? <span className="ktab" aria-hidden /> : null}
    </div>
  );
}
