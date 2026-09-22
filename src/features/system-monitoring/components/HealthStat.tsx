import { useMemo } from "react";
import { TriangleAlert, type LucideIcon } from "lucide-react";
import { Svg } from "@shared/components/bright";
import { hash, tileSvg } from "@shared/lib/art";
import type { HueClass } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";

interface Props {
  label: string;
  /** The reading without its unit ("0.2 / 4.3"), so every card in the row sets its number at one size. */
  value: string;
  /** Set small after the number, the way Room pricing sets "/ hour" ("GB"). */
  unit?: string;
  /** The line under the number ("93% in use", "dev · 1.4.2"). */
  meta?: string;
  /**
   * The reading is past its threshold: the field turns red and the meta line
   * leads with a warning sign instead of a trend arrow, so "93% in use" reads
   * as "nearly full", not "going down".
   */
  alarm?: boolean;
  Icon: LucideIcon;
  /** The family the card keeps while the reading is normal. */
  hue: HueClass;
  loading?: boolean;
}

/** Same motif set and pick (by label) as the shared StatCard, so the tiles match the other stat rows. */
const MOTIFS = ["rings", "dots", "quarter", "bars", "blocks", "half", "stairs", "circle"] as const;

/**
 * One health reading as the shared StatCard's colour tile (hue field, corner
 * motif, Albert Sans number), with two things this row needs and StatCard
 * cannot take yet: a unit set small beside the number, and an alarm that is
 * a warning sign rather than StatCard's falling-trend arrow.
 *
 * Every card uses the same number size — StatCard shrinks long values, which
 * left one row of four with three sizes and baselines. The unit is what made
 * the values long, so it moves out of the number.
 *
 * Below sm two cards share a phone row, so the field, padding, number and
 * motif step down (as the page's other compact tiles do).
 */
export function HealthStat({ label, value, unit, meta, alarm, Icon, hue, loading }: Props) {
  const motif = useMemo(() => tileSvg(MOTIFS[hash(label) % MOTIFS.length]), [label]);

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[148px] flex-col overflow-hidden rounded-[26px] bg-k-100 p-5 text-k-900",
        "max-sm:min-h-[140px] max-sm:rounded-[22px] max-sm:p-4",
        alarm ? "k-trans" : hue,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-6 -z-10 size-28 opacity-90 max-sm:size-20 [&_svg]:size-full"
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
          // One line, one size: the unit rides the number's baseline.
          <p className="flex items-baseline gap-1 whitespace-nowrap pr-12 font-display leading-none max-sm:pr-0">
            <span className="text-[32px] font-extrabold tracking-[-0.035em] tabular-nums max-sm:text-[26px]">
              {value}
            </span>
            {unit && (
              <span className="text-[16px] font-bold tracking-[-0.01em] text-k-700 max-sm:text-[14px]">{unit}</span>
            )}
          </p>
        )}
        {meta && !loading && (
          // The text stays in the field's own ink (AA on the red field too);
          // only the warning sign is red.
          <p
            className={cn(
              "mt-2 flex items-start gap-1 pr-12 text-[12.5px] font-medium leading-snug max-sm:pr-8",
              alarm ? "text-k-900" : "text-k-700",
            )}
          >
            {alarm && <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-danger" />}
            <span className="min-w-0 break-words">{meta}</span>
          </p>
        )}
      </div>
    </div>
  );
}
