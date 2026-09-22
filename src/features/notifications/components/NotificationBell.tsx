import * as Popover from "@radix-ui/react-popover";
import { ArrowRight, Bell, BellOff, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { ROUTES } from "@shared/constants/routes";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@shared/components/ui/Spinner";
import {
  useListNotificationsQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useUnreadCountQuery,
} from "@features/notifications/api/notificationsApi";
import { NOTIFICATION_STATUS } from "@shared/types/lms";
import type { NotificationDto } from "@features/notifications/types";
import { notificationKind, UNREAD_TILE_RING } from "@features/notifications/lib/notificationKind";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const isUnread = (n: NotificationDto) => !n.readAt && n.status !== NOTIFICATION_STATUS.READ;

/**
 * The header bell and its popover — the website's bell (a gold count on a
 * round icon button) opening a Bright menu panel: hairline card, 22px radius,
 * a raised shadow, and the inbox's rows in miniature.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { data: unread } = useUnreadCountQuery();
  const { data, isFetching } = useListNotificationsQuery({ page: 0, size: 6 });
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

  const count = unread?.count ?? 0;
  const items = data?.content ?? [];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
          className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-ink/6 hover:text-ink data-[state=open]:bg-ink/6 data-[state=open]:text-ink"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold leading-none tabular-nums text-on-gold ring-2 ring-paper">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-[60] w-[380px] max-w-[calc(100vw-2rem)] animate-pop-in overflow-hidden rounded-[22px] border border-raised-line bg-raised text-ink shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line py-3 pl-5 pr-3">
            <p className="flex items-center gap-2 font-display text-[16px] font-bold tracking-[-0.014em] text-ink">
              Notifications
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-tint px-1.5 font-mono text-[11px] font-semibold tracking-normal text-navy">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-navy transition-colors hover:bg-navy-tint disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="custom-scrollbar max-h-[380px] overflow-y-auto">
            {isFetching && items.length === 0 ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span aria-hidden className="icon-tile size-12 [&_svg]:size-5">
                  <BellOff />
                </span>
                <p className="text-sm text-ink-2">You're all caught up.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => {
                  const unreadItem = isUnread(n);
                  // Tinted by what the message is, as on the Notifications page.
                  const { Icon, tile } = notificationKind(n, unreadItem);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => { if (unreadItem) markRead(n.id); }}
                        className={cn(
                          "flex w-full gap-3 px-5 py-3.5 text-left transition-colors duration-200",
                          // Inset ring: the scroll box clips anything drawn outside the row.
                          "focus-visible:outline-offset-[-3px]",
                          unreadItem ? "bg-navy-tint/60 hover:bg-navy-tint" : "hover:bg-paper-2",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-[12px]",
                            tile,
                            unreadItem && UNREAD_TILE_RING,
                          )}
                        >
                          <Icon className="size-4" />
                          {unreadItem && (
                            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-gold ring-2 ring-surface" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[13.5px]",
                              unreadItem ? "font-semibold text-ink" : "font-medium text-ink-2",
                            )}
                          >
                            {n.title}
                          </span>
                          {/* line-clamp sets its own display; a `block` here would switch the clamp off. */}
                          <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{n.body}</span>
                          <span className="mt-1 block text-[11.5px] text-ink-3">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line p-2">
            <Popover.Close asChild>
              <button
                type="button"
                onClick={() => navigate(ROUTES.notifications)}
                className="group inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[14px] px-3 text-[13.5px] font-semibold text-navy transition-colors hover:bg-navy-tint"
              >
                View all notifications
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
