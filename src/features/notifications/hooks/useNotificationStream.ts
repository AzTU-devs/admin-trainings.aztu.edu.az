import { useEffect } from "react";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import { useAppDispatch } from "@lib/redux/hooks";
import { notificationsApi } from "@features/notifications/api/notificationsApi";

/**
 * Subscribes to the server-sent-events notification stream and invalidates the
 * RTK Query caches so the bell + list refresh in real time. No-op when the
 * feature flag is off. Falls back gracefully if EventSource isn't available.
 *
 * The backend is expected to expose `GET /notifications/stream` (SSE) emitting
 * `notification` events whose payload is a JSON `Notification`.
 */
export function useNotificationStream() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!env.features.wsNotifications) return;
    if (typeof EventSource === "undefined") return;

    const token = appStorage.get<string>(STORAGE_KEYS.accessToken);
    if (!token) return;

    // EventSource can't set Authorization headers; pass token as query param.
    const url = `${env.api.baseUrl}/notifications/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: true });

    const refresh = () => {
      dispatch(
        notificationsApi.util.invalidateTags([
          { type: "Notification", id: "LIST" },
          { type: "Notification", id: "UNREAD" },
        ]),
      );
    };

    const onNotification = (e: MessageEvent) => {
      refresh();
      try {
        const data = JSON.parse(e.data) as { title?: string };
        if (data.title) toast(data.title, { description: "New notification" });
      } catch {
        /* non-JSON heartbeat — ignore */
      }
    };

    es.addEventListener("notification", onNotification as EventListener);
    es.onerror = () => {
      // Browser auto-reconnects; nothing to do. Avoid noisy logs.
    };

    return () => {
      es.removeEventListener("notification", onNotification as EventListener);
      es.close();
    };
  }, [dispatch]);
}
