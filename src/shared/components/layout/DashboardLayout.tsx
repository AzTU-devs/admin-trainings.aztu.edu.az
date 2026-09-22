import { Outlet } from "react-router";
import { useAppSelector } from "@lib/redux/hooks";
import { cn } from "@shared/lib/cn";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNotificationStream } from "@features/notifications/hooks/useNotificationStream";

/**
 * Top-level authenticated shell:
 *
 *   ┌── Sidebar ──┬── Header ──────────────────┐
 *   │             │                            │
 *   │             │   <Outlet />               │
 *   │             │                            │
 *   └─────────────┴────────────────────────────┘
 *
 * Sidebar is fixed (a floating card, 272px wide or 92px collapsed — keep in
 * step with Sidebar.tsx); the main column shifts via left-padding so the
 * layout remains scrollable without resize jank when the sidebar collapses.
 *
 * `overflow-x-clip` on the content column matters: without it a page that
 * renders something wider than the viewport (a table that escapes its scroll
 * container, a long unbroken string) makes the document scroll sideways, and
 * the sticky header — sized to the viewport — stops short of the content's
 * right edge. Clipping keeps the bar spanning the full column at every width.
 */
export function DashboardLayout() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  useNotificationStream();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Sidebar />
      <div
        className={cn(
          "min-w-0 overflow-x-clip transition-[padding-left] duration-300 ease-out",
          collapsed ? "lg:pl-[92px]" : "lg:pl-[272px]",
        )}
      >
        <Header />
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
