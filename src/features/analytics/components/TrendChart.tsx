import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@shared/lib/cn";

type Point = { date: string; count: number };

/**
 * Round the axis up to a clean top value in 3–5 whole-number steps (70 → 80
 * in steps of 20), so the ticks read 0 / 20 / 40 … rather than 0 / 17.5 / 35.
 */
function axisFor(max: number): { top: number; step: number } {
  const raw = Math.max(max, 1) / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  // Counts are whole numbers, so a step below 1 would only repeat labels.
  const step = Math.max(1, nice * exp);
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

// The browser's locale, as in every table, so the dates on screen share one
// style. UTC because the API's days are plain dates ("2026-09-21").
const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** "2026-09-21" → "Sep 21" (in the browser's locale); anything that isn't a date is shown as it came. */
function shortDate(value: string): string {
  const d = new Date(ISO_DAY.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? value : dayFmt.format(d);
}

/** Today in Baku as "yyyy-mm-dd": the API counts enrolments by Baku days. */
function todayInBaku(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * One point per calendar day across the selected range (today minus `days`
 * to today), with 0 for the days the API leaves out: it only sends days that
 * had enrolments. Evenly spaced days make the x axis time, so two busy days in
 * a 30-day range sit at its right end instead of being stretched across the
 * whole width like a month-long slope, and the axis ends are the range bounds.
 * A point outside the window widens it rather than being dropped. If a date
 * isn't a plain day (or the span is implausible) the points are drawn as they
 * came, as before.
 */
function daily(points: Point[], days: number | undefined): Point[] {
  if (!days || points.length === 0 || !points.every((p) => ISO_DAY.test(p.date))) return points;
  const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const dates = points.map((p) => at(p.date));
  const end = Math.max(at(todayInBaku()), ...dates);
  const start = Math.min(end - days * DAY_MS, ...dates);
  if (!Number.isFinite(start) || !Number.isFinite(end) || (end - start) / DAY_MS > 400) return points;

  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.date, (counts.get(p.date) ?? 0) + p.count);
  const out: Point[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, count: counts.get(date) ?? 0 });
  }
  return out;
}

/** Which points get an x-axis label: all of them when few, else first, middle and last. */
function labelled(n: number): number[] {
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.floor((n - 1) / 2), n - 1];
}

/**
 * The enrolments line, drawn without a chart library. With `days` (the
 * selected range) the x axis is the calendar: one evenly spaced point per day,
 * empty days at 0 (see `daily`). Without it the points are spaced evenly in
 * the order the API sends them. The drawing: a 2px navy line over a faint
 * wash, hairline gridlines with whole ticks, the last value labelled, and a
 * crosshair that shows the day and the count under the pointer (or the arrow
 * keys once the chart has focus).
 *
 * Lines and fills are one SVG stretched to the box (non-scaling strokes keep
 * them 2px); dots and text are HTML placed by percentage, so they stay round
 * and sharp at any width. Axis labels are Onest with tabular figures, like
 * the counts in the lists beside the chart: mono is kept for the log pages.
 */
export function TrendChart({
  points: raw,
  days,
  labelledBy,
}: {
  points: Point[];
  /** The selected range in days; places the points by date across it. */
  days?: number;
  labelledBy?: string;
}) {
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const points = useMemo(() => daily(raw, days), [raw, days]);

  const geo = useMemo(() => {
    const max = Math.max(0, ...points.map((p) => p.count));
    const { top, step } = axisFor(max);
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    const xy = points.map((p, i) => ({
      x: points.length > 1 ? (i / (points.length - 1)) * 100 : 50,
      y: (p.count / top) * 100,
    }));
    const line = xy.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${100 - p.y}`).join(" ");
    const area = xy.length > 1 ? `${line} L ${xy[xy.length - 1].x} 100 L ${xy[0].x} 100 Z` : "";
    return { top, ticks, xy, line, area };
  }, [points]);

  const n = points.length;
  const last = n - 1;
  // The series can change length under the pointer (a range switch, a refetch).
  const shown = active !== null && active < n ? active : null;

  function pick(clientX: number) {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const t = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    setActive(n > 1 ? Math.round(t * last) : 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const at = shown ?? last;
    const next =
      e.key === "ArrowLeft" ? Math.max(0, at - 1)
      : e.key === "ArrowRight" ? Math.min(last, at + 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  }

  if (n === 0) return null;
  const p = shown !== null ? geo.xy[shown] : null;
  const hovered = shown !== null ? points[shown] : null;
  // The tooltip sits beside the point (right of it, or left past the middle)
  // and is held inside the plot vertically, so it never covers the card title.
  const flip = p ? p.x > 55 : false;
  // Daily points make steep spikes, and a line coming down into the last dot
  // runs through the space above it; the label then goes below the dot when
  // there is room above the baseline. A surface halo keeps it legible if the
  // line still passes behind it.
  const lastDown = n > 1 && points[last - 1].count > points[last].count;
  const labelBelow = lastDown && geo.xy[last].y > 20;

  return (
    <div className="relative h-56 select-none sm:h-64">
      <div
        ref={plotRef}
        role="group"
        aria-labelledby={labelledBy}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? last)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
        className="absolute bottom-8 left-10 right-2 top-3 cursor-crosshair rounded-[6px] outline-offset-4"
      >
        {/* Gridlines and y ticks. The baseline is one step stronger than the rest. */}
        {geo.ticks.map((t) => (
          <div key={t} aria-hidden className="absolute inset-x-0" style={{ bottom: `${(t / geo.top) * 100}%` }}>
            <span className={cn("block h-px w-full", t === 0 ? "bg-line-2" : "bg-line")} />
            <span className="absolute -left-10 w-8 translate-y-[-50%] pr-1 text-right text-[12px] leading-none text-ink-3 tabular-nums">
              {t.toLocaleString()}
            </span>
          </div>
        ))}

        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--navy)", stopOpacity: 0.16 }} />
              <stop offset="100%" style={{ stopColor: "var(--navy)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {geo.area && <path d={geo.area} fill={`url(#${gradientId})`} />}
          <path
            d={geo.line}
            fill="none"
            stroke="var(--navy)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {p && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-ink/15"
            style={{ left: `${p.x}%` }}
          />
        )}

        {/* The last point is always marked and labelled; the hovered one takes over while you explore. */}
        {(shown === null ? [last] : [shown]).map((i) => {
          const q = geo.xy[i];
          return (
            <span
              key={i}
              aria-hidden
              className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-navy shadow-[0_0_0_2.5px_var(--surface)]"
              style={{ left: `${q.x}%`, bottom: `${q.y}%` }}
            />
          );
        })}

        {shown === null ? (
          <span
            aria-hidden
            className={cn(
              "absolute whitespace-nowrap font-display text-[15px] font-extrabold leading-none tracking-[-0.02em] text-ink tabular-nums",
              "[text-shadow:0_0_3px_var(--surface),0_0_3px_var(--surface),0_0_6px_var(--surface)]",
              labelBelow ? "translate-y-full pt-2.5" : "-translate-y-full pb-2.5",
              geo.xy[last].x > 82 ? "-translate-x-full" : "-translate-x-1/2",
            )}
            style={{ left: `${geo.xy[last].x}%`, bottom: `${geo.xy[last].y}%` }}
          >
            {points[last].count.toLocaleString()}
          </span>
        ) : (
          p &&
          hovered && (
            <div
              className={cn(
                // The app's tooltip look: ink, inverted at night.
                "pointer-events-none absolute z-10 h-12 whitespace-nowrap rounded-[12px] bg-ink px-3 py-2 text-paper shadow-tooltip",
                flip ? "-translate-x-full" : "",
              )}
              style={{
                left: `calc(${p.x}% ${flip ? "-" : "+"} 14px)`,
                bottom: `clamp(0px, calc(${p.y}% - 24px), calc(100% - 48px))`,
              }}
            >
              <p className="text-[12px] font-medium leading-none text-paper/70">{shortDate(hovered.date)}</p>
              <p className="mt-1.5 font-display text-[17px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
                {hovered.count.toLocaleString()}
              </p>
            </div>
          )
        )}

        {/* What the tooltip shows, for screen readers following the arrow keys. */}
        <span className="sr-only" aria-live="polite">
          {hovered ? `${shortDate(hovered.date)}: ${hovered.count.toLocaleString()}` : ""}
        </span>
      </div>

      {/* X axis: dates under their points, the outer two held inside the box. */}
      <div aria-hidden className="absolute bottom-0 left-10 right-2 h-5">
        {labelled(n).map((i) => {
          const x = geo.xy[i].x;
          return (
            <span
              key={i}
              className={cn(
                "absolute top-0 whitespace-nowrap text-[12px] leading-none tabular-nums",
                i === shown ? "text-ink" : "text-ink-3",
                n === 1 ? "-translate-x-1/2" : i === 0 ? "" : i === last ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${x}%` }}
            >
              {shortDate(points[i].date)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
