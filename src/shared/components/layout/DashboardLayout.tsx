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
 * Sidebar is fixed; the main column shifts via left-padding so the layout
 * remains scrollable without resize jank when the sidebar collapses.
 */
export function DashboardLayout() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  useNotificationStream();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        className={cn(
          "transition-[padding-left] duration-300 ease-in-out",
          collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]",
        )}
      >
        <Header />
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
