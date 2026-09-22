import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Svg } from "@shared/components/bright";
import { tileSvg } from "@shared/lib/art";
import type { HueClass } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  Icon: LucideIcon;
  hue: HueClass;
  /**
   * A tile motif from @shared/lib/art (`tileSvg` kinds). Pick the one the
   * website draws for the same colour family (data → dots, res → book,
   * eng → gear, build → arch, energy → wave), so a tile reads as its subject.
   */
  motif: string;
  loading?: boolean;
  className?: string;
}

/**
 * One of the dashboard's four stat tiles: the website's category tile
 * (`.cat-tile`) at the size and rhythm of the shared StatCard, so the home
 * row and the Analytics row look alike. Label top left, the subject icon in
 * the round "go" disc, the number in Albert Sans, the meta line under it and
 * the subject's motif cropped in the corner.
 *
 * Like StatCard it only shows a figure — the motif is the subject's own
 * rather than StatCard's label-hashed one.
 */
export function StatTile({ label, value, delta, Icon, hue, motif, loading, className }: Props) {
  const markup = useMemo(() => tileSvg(motif), [motif]);
  const text = String(value);
  // Long values step down so they never run into the motif (same steps as StatCard).
  const valueSize = text.length > 10 ? "text-[24px]" : text.length > 6 ? "text-[28px]" : "text-[34px]";

  return (
    <div className={cn("cat-tile min-h-[148px] p-5", hue, className)}>
      <span aria-hidden className="art-box -bottom-6 -right-6 size-24 opacity-90 sm:size-28">
        <Svg markup={markup} />
      </span>

      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13.5px] font-semibold leading-snug text-k-900/85">{label}</p>
        <span aria-hidden className="go text-k-700">
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
        {/*
          The meta line is StatCard's (12.5px, k-700), so every stat tile in the
          app carries its meta the same way. It is always rendered: a tile with
          no meta keeps the empty line, so the numbers along the row share a
          baseline. On a phone, where two tiles share the row and "8 requests
          pending" wraps, the slot holds two lines for the same reason.
        */}
        {!loading && (
          <p className="mt-2 min-h-[2.75em] pr-12 text-[12.5px] font-medium leading-snug text-k-700 sm:min-h-0">
            {delta ?? <span aria-hidden>&nbsp;</span>}
          </p>
        )}
      </div>
    </div>
  );
}
