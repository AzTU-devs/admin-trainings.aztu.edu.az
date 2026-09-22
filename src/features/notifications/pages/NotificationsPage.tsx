import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { apiErrorMessage } from "@shared/lib/apiError";
import { cn } from "@shared/lib/cn";
import {
  useListNotificationsFeedInfiniteQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
} from "@features/notifications/api/notificationsApi";
import { NOTIFICATION_STATUS } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import type { NotificationDto } from "@features/notifications/types";

const isUnread = (n: NotificationDto) => !n.readAt && n.status !== NOTIFICATION_STATUS.READ;

export default function NotificationsPage() {
  const { can } = usePermissions();
  const hasInbox = can("notification:read_own");
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useListNotificationsFeedInfiniteQuery(undefined, { skip: !hasInbox });
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

  // Every loaded page, in order — "Load more" appends rather than replaces.
  const items = data?.pages.flatMap((p) => p.content) ?? [];

  const read = async (n: NotificationDto) => {
    if (!isUnread(n)) return;
    try {
      await markRead(n.id).unwrap();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not mark the notification as read"));
    }
  };

  const readAll = async () => {
    try {
      const res = await markAllRead().unwrap();
      toast.success(res?.updated ? `${res.updated} marked as read` : "Everything is read");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not mark notifications as read"));
    }
  };

  if (!hasInbox) {
    return (
      <>
        <PageHeader title="Notifications" description="Your in-app messages." />
        <EmptyState
          title="No inbox for this account"
          description="Your role doesn't receive in-app notifications. Broadcasts you send are delivered to their recipients' inboxes."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Your in-app messages."
        actions={
          <Button variant="secondary" leftIcon={<CheckCheck className="size-4" />} loading={markingAll} onClick={readAll}>
            Mark all read
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError && items.length === 0 ? (
        <QueryErrorState error={error} onRetry={refetch} what="your notifications" />
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="Nothing here yet." />
      ) : (
        <Card className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void read(n)}
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap break-words">{n.body}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge tone="neutral" size="sm">{enumLabel("notificationChannel", n.channel)}</Badge>
                  <Badge tone={n.status === NOTIFICATION_STATUS.FAILED ? "danger" : "neutral"} size="sm">{enumLabel("notificationStatus", n.status)}</Badge>
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {hasNextPage && !isError && (
        <div className="flex justify-center mt-4">
          <Button variant="secondary" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
      {isError && items.length > 0 && (
        <p role="alert" className="mt-4 text-center text-sm text-error-600">
          Couldn't load more.{" "}
          <button type="button" className="font-medium underline" onClick={() => void fetchNextPage()}>
            Retry
          </button>
        </p>
      )}
    </>
  );
}
