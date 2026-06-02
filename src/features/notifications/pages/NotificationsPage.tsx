import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { cn } from "@shared/lib/cn";
import {
  useListNotificationsQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
} from "@features/notifications/api/notificationsApi";
import { NOTIFICATION_STATUS } from "@shared/types/lms";
import type { NotificationDto } from "@features/notifications/types";

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
        <EmptyState title="No notifications" description="Nothing here yet." />
      ) : (
        <Card className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { if (isUnread(n)) markRead(n.id); }}
              className={cn(
                "w-full text-left flex gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors",
                isUnread(n) && "bg-brand-50/40 dark:bg-brand-500/5",
              )}
            >
              <span className={cn("mt-1.5 size-2 rounded-full shrink-0", isUnread(n) ? "bg-brand-600" : "bg-transparent")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.body}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge tone="neutral" size="sm">{n.channel}</Badge>
                  <Badge tone={n.status === NOTIFICATION_STATUS.FAILED ? "danger" : "neutral"} size="sm">{n.status}</Badge>
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} loading={isFetching}>Load more</Button>
        </div>
      )}
    </>
  );
}
