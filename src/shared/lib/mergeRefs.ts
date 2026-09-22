import type { Ref, RefCallback } from "react";

/**
 * One ref callback that feeds several refs — a component's forwarded ref and
 * the one it keeps for itself (Tabs, Dialog). Memoise the result with
 * useCallback, or it re-attaches on every render.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}
