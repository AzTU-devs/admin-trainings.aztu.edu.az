import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
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
          className="relative size-10 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 inline-flex items-center justify-center"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-semibold inline-flex items-center justify-center ring-2 ring-white dark:ring-gray-dark">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            {isFetching && items.length === 0 ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => { if (isUnread(n)) markRead(n.id); }}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex gap-3",
                        isUnread(n) && "bg-brand-50/40 dark:bg-brand-500/5",
                      )}
                    >
                      <span className={cn("mt-1.5 size-2 rounded-full shrink-0", isUnread(n) ? "bg-brand-600" : "bg-transparent")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</span>
                        <span className="block text-[11px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 p-2">
            <Popover.Close asChild>
              <button
                type="button"
                onClick={() => navigate(ROUTES.notifications)}
                className="w-full rounded-xl px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                View all notifications
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
