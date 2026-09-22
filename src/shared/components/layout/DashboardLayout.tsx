import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { useAppSelector } from "@lib/redux/hooks";
import { cn } from "@shared/lib/cn";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNotificationStream } from "@features/notifications/hooks/useNotificationStream";
import { ErrorBoundary } from "@shared/components/feedback/ErrorBoundary";
import { RouteFallback } from "@shared/components/feedback/RouteFallback";

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
 *
 * `overflow-x-clip` on the content column matters: without it a page that
 * renders something wider than the viewport (a table that escapes its scroll
 * container, a long unbroken string) makes the document scroll sideways, and
 * the sticky header — sized to the viewport — stops short of the content's
 * right edge. Clipping keeps the bar spanning the full column at every width.
 *
 * Each page renders inside its own error boundary and Suspense. The only
 * boundary used to wrap the whole app outside the router, so any page error —
 * or a lazy chunk missing after a deploy — replaced the sidebar and header too,
 * leaving nothing to navigate away with. Keyed by path, so leaving a broken page
 * clears the error.
 */
export function DashboardLayout() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const { pathname } = useLocation();
  useNotificationStream();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        className={cn(
          "min-w-0 overflow-x-clip transition-[padding-left] duration-300 ease-in-out",
          collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]",
        )}
      >
        <Header />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={pathname} variant="page">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
