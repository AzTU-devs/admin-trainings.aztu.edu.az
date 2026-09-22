import { type ReactNode, useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { store } from "@lib/redux/store";
import { baseApi } from "@lib/query/baseApi";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { logout, tokenRefreshed } from "@features/auth/store/authSlice";
import { ErrorBoundary } from "@shared/components/feedback/ErrorBoundary";
import { DevAuthBootstrap } from "./DevAuthBootstrap";
import { AuthBootstrap } from "./AuthBootstrap";

/**
 * Top-level providers. Order matters:
 *   ErrorBoundary > Redux > Helmet > Theme effect > children > Toaster
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <HelmetProvider>
          <ThemeSync />
          <AuthEventBridge />
          <DevAuthBootstrap />
          <AuthBootstrap />
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ className: "rounded-xl" }}
          />
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

/**
 * Bridges the axios layer (which cannot import the store) to the auth slice:
 * `auth:logout` when a silent refresh fails, `auth:token` when one succeeds —
 * without the latter the slice kept the token it signed in with while storage
 * moved on.
 */
function AuthEventBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onLogout = () => {
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
    };
    const onToken = (e: Event) => {
      const token = (e as CustomEvent<{ accessToken?: string }>).detail?.accessToken;
      if (token) dispatch(tokenRefreshed(token));
    };
    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("auth:token", onToken);
    return () => {
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("auth:token", onToken);
    };
  }, [dispatch]);

  return null;
}
