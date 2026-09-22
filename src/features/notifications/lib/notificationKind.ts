import { Bell, CircleCheck, FilePenLine, Megaphone, type LucideIcon } from "lucide-react";
import type { NotificationDto } from "@features/notifications/types";

export interface NotificationKind {
  Icon: LucideIcon;
  /** The icon tile's fill and ink (theme-aware tokens). */
  tile: string;
}

/*
 * The backend's template codes (NotificationDispatcher callers): a course
 * decision for its tutor, or an admin broadcast. Each gets the tint of what
 * it means — good news green, a request for changes amber, a broadcast navy —
 * so an inbox of them reads before a word of it is read. Unknown codes keep
 * the quiet bell.
 */
const KINDS: Record<string, NotificationKind> = {
  "course.published": { Icon: CircleCheck, tile: "bg-ok-tint text-ok" },
  "course.rejected": { Icon: FilePenLine, tile: "bg-warn-tint text-warn" },
  "admin.broadcast": { Icon: Megaphone, tile: "bg-navy-tint text-navy" },
};

/** The quiet bell: navy on a surface tile while unread, grey once read (as before). */
const BELL_UNREAD: NotificationKind = { Icon: Bell, tile: "bg-surface text-navy" };
const BELL_READ: NotificationKind = { Icon: Bell, tile: "bg-paper-2 text-ink-3" };

/** The icon and tile colour for a notification, by its template code. */
export function notificationKind(n: Pick<NotificationDto, "templateCode">, unread: boolean): NotificationKind {
  return (n.templateCode && KINDS[n.templateCode]) || (unread ? BELL_UNREAD : BELL_READ);
}

/**
 * Unread rows sit on a navy-tint wash; a hairline in the navy lifts the tile
 * off it (a navy-tint tile would otherwise melt into the row).
 */
export const UNREAD_TILE_RING = "shadow-[0_0_0_1px_color-mix(in_oklch,var(--navy)_18%,transparent)]";
