import { useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { StatusBadge } from "@shared/components/ui/Badge";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { cn } from "@shared/lib/cn";
import { formatEnum } from "@shared/lib/enums";
import {
  useListNotificationsQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
} from "@features/notifications/api/notificationsApi";
import { NOTIFICATION_STATUS } from "@shared/types/lms";
import type { NotificationDto } from "@features/notifications/types";
import { notificationKind, UNREAD_TILE_RING } from "@features/notifications/lib/notificationKind";

const isUnread = (n: NotificationDto) => !n.readAt && n.status !== NOTIFICATION_STATUS.READ;

export default function NotificationsPage() {
  const [page, setPage] = useState(0);
  const { data, isFetching } = useListNotificationsQuery({ page, size: 20 });
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

  const items = data?.content ?? [];
  const hasMore = data ? page + 1 < data.totalPages : false;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Your in-app messages."
        actions={
          <Button variant="secondary" leftIcon={<CheckCheck className="size-4" />} loading={markingAll} onClick={() => markAllRead()}>
            Mark all read
          </Button>
        }
      />

      {isFetching && items.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState Icon={BellOff} title="No notifications" description="Nothing here yet." />
      ) : (
        // The website's inbox: an icon tile per message, tinted by what the
        // message is (published, needs changes, broadcast), with a gold dot
        // while it is unread; a navy-tint wash on unread rows, hairlines between.
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const unread = isUnread(n);
              const { Icon, tile } = notificationKind(n, unread);
              const failed = n.status === NOTIFICATION_STATUS.FAILED;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => { if (unread) markRead(n.id); }}
                    className={cn(
                      "flex w-full gap-4 px-5 py-4 text-left transition-colors duration-200 sm:px-6",
                      // Inset ring: the card clips anything drawn outside the row.
                      "focus-visible:outline-offset-[-3px]",
                      unread ? "bg-navy-tint/60 hover:bg-navy-tint" : "hover:bg-paper-2",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "relative grid size-10 shrink-0 place-items-center rounded-[14px]",
                        tile,
                        unread && UNREAD_TILE_RING,
                      )}
                    >
                      <Icon className="size-[18px]" />
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-gold ring-2 ring-surface" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block break-words text-[15px] leading-snug",
                          unread ? "font-semibold text-ink" : "font-medium text-ink-2",
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="mt-1 block whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">{n.body}</span>
                      {/* One quiet meta line — date · channel · status — so the
                          title and message lead. Only a failed delivery keeps
                          a pill, because that one needs noticing. */}
                      <span className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-ink-3">
                        <time dateTime={n.createdAt} className="tabular-nums">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </time>
                        <span aria-hidden>·</span>
                        <span>{formatEnum(n.channel)}</span>
                        <span aria-hidden>·</span>
                        {failed ? <StatusBadge value={n.status} size="sm" /> : <span>{formatEnum(n.status)}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {hasMore && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} loading={isFetching}>Load more</Button>
        </div>
      )}
    </>
  );
}
