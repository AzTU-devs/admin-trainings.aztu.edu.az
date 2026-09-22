import { type ReactNode, useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { store } from "@lib/redux/store";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { logout } from "@features/auth/store/authSlice";
import { ErrorBoundary } from "@shared/components/feedback/ErrorBoundary";
import { TooltipProvider } from "@shared/components/ui/Tooltip";
import { DevAuthBootstrap } from "./DevAuthBootstrap";
import { AuthBootstrap } from "./AuthBootstrap";

/**
 * Top-level providers. Order matters:
 *   ErrorBoundary > Redux > Helmet > Tooltip > Theme effect > children > Toaster
 *
 * One TooltipProvider for the app, so moving between icon buttons (row
 * actions, the header) skips the delay after the first tooltip.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <HelmetProvider>
          <TooltipProvider>
            <ThemeSync />
            <AuthEventBridge />
            <DevAuthBootstrap />
            <AuthBootstrap />
            {children}
            {/* Below the sticky header (68px, 60px on a phone): at the default
                offset a toast covered the avatar and theme toggle on a
                desktop, and the menu button, logo and bell on a phone. */}
            <Toaster
              position="top-right"
              offset={{ top: 80, right: 24 }}
              mobileOffset={{ top: 72, left: 16, right: 16 }}
              richColors
              closeButton
              toastOptions={{ className: "rounded-xl" }}
            />
          </TooltipProvider>
        </HelmetProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

/** Applies the `dark` class to <html> based on the ui.theme setting. */
function ThemeSync() {
  const theme = useAppSelector((s) => s.ui.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    apply(theme);
  }, [theme]);

  return null;
}

/** Listens for `auth:logout` window events from the axios refresh failure path. */
function AuthEventBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handler = () => dispatch(logout());
    window.addEventListener("auth:logout", handler as EventListener);
    return () => window.removeEventListener("auth:logout", handler as EventListener);
  }, [dispatch]);

  return null;
}
