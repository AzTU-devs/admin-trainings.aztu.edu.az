import { useEffect } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import { toast } from "sonner";
import { env } from "@shared/config/env";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { refreshAccessToken } from "@lib/axios/httpClient";
import { isTokenExpired } from "@lib/auth/jwt";
import { notificationsApi } from "@features/notifications/api/notificationsApi";

/**
 * Real-time notifications over STOMP-on-WebSocket.
 *
 * The backend exposes a plain WebSocket STOMP endpoint at `/ws` (sibling of the
 * `/api` REST prefix), authenticates the STOMP CONNECT frame via an
 * `Authorization: Bearer <jwt>` header, and pushes new notifications to the
 * per-user destination `/user/queue/notifications`.
 *
 * On each message we toast the title and invalidate the notification RTK Query
 * caches so the bell + list refresh. Gated behind the `wsNotifications` flag.
 */
export function useNotificationStream() {
  const dispatch = useAppDispatch();
  // Restart the client when the signed-in user changes (sign-in, sign-out,
  // another account) — not on every token refresh, which beforeConnect handles.
  const userId = useAppSelector((s) => (s.auth.status === "authenticated" ? s.auth.user?.id : undefined));
  // No inbox, no stream (an ADMIN lacks notification:read_own).
  const hasInbox = useAppSelector((s) => s.auth.user?.permissions?.includes("notification:read_own") ?? true);

  useEffect(() => {
    if (!env.features.wsNotifications) return;
    if (typeof WebSocket === "undefined") return;
    if (!userId || !hasInbox) return;

    const brokerURL = resolveWsUrl(env.api.baseUrl);
    if (!brokerURL) return;

    const refresh = () => {
      dispatch(
        notificationsApi.util.invalidateTags([
          { type: "Notification", id: "LIST" },
          { type: "Notification", id: "UNREAD" },
        ]),
      );
    };

    const client = new Client({
      brokerURL,
      /*
       * STOMP CONNECT auth — the backend reads this header on the CONNECT frame.
       *
       * Set before EVERY connect, not once. The token used to be read on mount
       * into static connectHeaders, which stompjs resends unchanged on each
       * reconnect; any reconnect after the 15-minute access-token lifetime was
       * refused, and the client retried every 5 s with the dead token forever —
       * live notifications stopped for the rest of the session.
       */
      beforeConnect: async (c) => {
        let token = appStorage.get<string>(STORAGE_KEYS.accessToken);
        if (!token || isTokenExpired(token)) {
          try {
            token = await refreshAccessToken();
          } catch {
            // The session is over; the 401 path signs the user out.
            await c.deactivate();
            return;
          }
        }
        c.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (message: IMessage) => {
          refresh();
          try {
            const data = JSON.parse(message.body) as { title?: string };
            if (data.title) toast(data.title, { description: "New notification" });
          } catch {
            /* non-JSON frame — ignore */
          }
        });
      },
      // Swallow STOMP/WS errors; the client auto-reconnects.
      onStompError: () => {},
      onWebSocketError: () => {},
    });

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [dispatch, userId, hasInbox]);
}

/**
 * Derive the STOMP WebSocket URL from the REST base URL.
 * `/ws` lives at the server root (not under `/api`), so strip a trailing `/api`
 * and swap the http(s) scheme for ws(s).
 */
function resolveWsUrl(apiBaseUrl: string): string | null {
  try {
    // Resolve relative bases (e.g. "/api") against the current origin.
    const base = new URL(apiBaseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const path = base.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
    const wsProtocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${base.host}${path}/ws`;
  } catch {
    return null;
  }
}
