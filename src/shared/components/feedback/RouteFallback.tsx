import { Spinner } from "@shared/components/ui/Spinner";

/** Shown while a lazily-loaded route chunk is in flight. */
export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
