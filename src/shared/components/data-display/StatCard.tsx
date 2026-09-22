import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { hash, tileSvg } from "@shared/lib/art";
import type { HueClass } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { Svg } from "@shared/components/bright/Svg";

type Accent = "brand" | "gold" | "success" | "warning" | "danger";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "neutral" | "up" | "down";
  Icon: LucideIcon;
  /**
   * Kept for existing callers. Only "danger" still changes the colour (a red
   * field, so an alarm reads as one); the others are decorative and give way
   * to the hue rotation below.
   */
  accent?: Accent;
  /**
   * The colour family (a `k-*` class from @shared/lib/categoryStyle). Leave it
   * out and cards take different families by their position in the row.
   */
  hue?: HueClass;
  /** Renders a placeholder bar in place of the value while the query is in flight. */
  loading?: boolean;
  className?: string;
}

/** The geometric motifs a stat card can carry in its corner, picked by label. */
const MOTIFS = ["rings", "dots", "quarter", "bars", "blocks", "half", "stairs", "circle"] as const;

/**
 * A stat as a small category tile: a hue colour field with a drafted motif in
 * the corner, the number in Albert Sans, the label and the trend under it —
 * the website's category tiles, made compact.
 *
 * Colour: an explicit `hue` wins; `accent="danger"` turns the field red;
 * otherwise `k-auto` picks a different family for each card in a row (see
 * "Category hue engine" in index.css), so a grid of four is four colours.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  Icon,
  accent,
  hue,
  loading,
  className,
}: Props) {
  const k = hue ?? (accent === "danger" ? "k-trans" : "k-auto");
  const motif = useMemo(() => tileSvg(MOTIFS[hash(label) % MOTIFS.length]), [label]);
  const text = String(value);
  // Long values ("3.2 / 15.6 GB") step down so they never overflow a narrow card.
  const valueSize = text.length > 10 ? "text-[24px]" : text.length > 6 ? "text-[28px]" : "text-[34px]";
  const TrendIcon = deltaTone === "up" ? ArrowUpRight : deltaTone === "down" ? ArrowDownRight : null;

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[148px] flex-col overflow-hidden rounded-[26px] bg-k-100 p-5 text-k-900",
        k,
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-6 -z-10 size-28 opacity-90 [&_svg]:size-full"
      >
        <Svg markup={motif} />
      </span>

      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13.5px] font-semibold leading-snug text-k-900/85">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-k-0 text-k-700 shadow-[0_1px_2px_oklch(0_0_0/0.06)]">
          <Icon className="size-[18px]" />
        </span>
      </div>

      <div className="mt-auto pt-4">
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-full bg-k-200" />
        ) : (
          <p
            className={cn(
              "break-words pr-12 font-display font-extrabold leading-none tracking-[-0.035em] tabular-nums",
              valueSize,
            )}
          >
            {value}
          </p>
        )}
        {delta && !loading && (
          <p
            className={cn(
              "mt-2 flex items-start gap-1 pr-12 text-[12.5px] font-medium leading-snug",
              deltaTone === "down" ? "text-danger" : "text-k-700",
            )}
          >
            {TrendIcon && <TrendIcon className="mt-px size-3.5 shrink-0" />}
            <span className="min-w-0 break-words">{delta}</span>
          </p>
        )}
      </div>
    </div>
  );
}
