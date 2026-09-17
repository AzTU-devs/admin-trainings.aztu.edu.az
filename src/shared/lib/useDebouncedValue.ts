import { useEffect, useState } from "react";

/**
 * The value, but only after it has stopped changing for `delayMs`.
 *
 * Used to keep a search box responsive while its query drives a server request:
 * typing "machine" would otherwise issue seven requests and render whichever
 * response happened to land last, which is not necessarily the one for the full
 * word. Debouncing sends one.
 *
 * The timer is cleared on every change and on unmount, so an in-flight delay never
 * resolves against a component that is gone.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
