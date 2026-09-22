import { Inbox } from "lucide-react";
import { CategorySwatch, SoftEmpty } from "@shared/components/bright";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import type { AnalyticsOverview } from "@features/analytics/api/analyticsApi";

/** The lists' shared "nothing yet" row (same words as before). */
export function NoData() {
  return <SoftEmpty icon={<Inbox />} title="No data." className="py-4" />;
}

/** Share of the leader, for the bars under each row (the leader fills the bar). */
const share = (value: number, max: number) => `${max > 0 ? (value / max) * 100 : 0}%`;

/**
 * Top courses as a ranked list: the position in a small tile (the leader's
 * in gold), the title, the enrolment count, and a thin navy bar
 * scaled to the leader so the gaps between them read at a glance. (No cover
 * thumbnails: the overview carries no categories, and at this size the
 * drawings only add noise next to the bars.)
 */
export function TopCourses({ items }: { items: AnalyticsOverview["topCourses"] }) {
  if (items.length === 0) return <NoData />;
  const max = Math.max(...items.map((c) => c.enrolledCount));
  return (
    <ol className="space-y-4">
      {items.map((c, i) => (
        <li key={c.id} className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[10px] text-[12.5px] font-semibold tabular-nums",
              i === 0 ? "bg-gold-tint text-gold-ink" : "bg-paper-2 text-ink-3",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[14px] font-medium text-ink" title={c.title}>
                {c.title}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-ink tabular-nums">{c.enrolledCount}</span>
            </div>
            <div className="hbar mt-2 h-1.5">
              <i style={{ width: share(c.enrolledCount, max) }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Top categories, each in its own colour family (the same swatch and hue the
 * catalogue gives it), with the course count and a bar in that hue.
 */
export function TopCategories({ items }: { items: AnalyticsOverview["topCategories"] }) {
  if (items.length === 0) return <NoData />;
  const max = Math.max(...items.map((c) => c.courseCount));
  return (
    <ul className="space-y-4">
      {items.map((c) => (
        <li key={c.id} className={cn("flex items-center gap-3", categoryStyle({ name: c.name }).k)}>
          <CategorySwatch category={{ name: c.name }} round className="size-8" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[14px] font-medium text-ink" title={c.name}>
                {c.name}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-ink tabular-nums">{c.courseCount}</span>
            </div>
            <div className="seats mt-2 h-1.5">
              <i style={{ width: share(c.courseCount, max) }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Room utilisation on a true 0–100% scale (not scaled to the busiest room —
 * the point is how much of each room's free time is used). Name, bar and
 * percentage in a row; on a phone the bar drops under the name.
 */
export function RoomUtilization({ items }: { items: AnalyticsOverview["roomUtilization"] }) {
  if (items.length === 0) return <NoData />;
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li
          key={r.roomId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3.5rem]"
        >
          <span className="truncate text-[14px] font-medium text-ink" title={r.roomName}>
            {r.roomName}
          </span>
          <span className="text-right text-[12.5px] font-medium text-ink-2 tabular-nums sm:order-3">
            {r.utilizationPct}%
          </span>
          <div className="hbar col-span-2 sm:order-2 sm:col-span-1">
            <i style={{ width: `${r.utilizationPct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
