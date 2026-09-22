import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept current as the window changes. Used
 * where two layouts would otherwise both be rendered and one hidden with CSS
 * (DataTable's phone cards): only one is mounted.
 *
 * Without `matchMedia` (tests) it reports `fallback`.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    },
    [query],
  );
  const get = () =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : fallback;
  return useSyncExternalStore(subscribe, get, () => fallback);
}

/** Tailwind's breakpoints, for useMediaQuery. */
export const MQ = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
} as const;
