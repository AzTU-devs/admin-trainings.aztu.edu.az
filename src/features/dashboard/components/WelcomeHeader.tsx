import { useMemo } from "react";
import { Svg } from "@shared/components/bright";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { tileSvg } from "@shared/lib/art";
import type { HueClass } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";

type Tile = { k: HueClass; motif: string; shape?: "round" | "arch" | "gold" };

/*
 * A pocket version of the website hero's "periodic table": one tile per
 * subject family, in the shapes the website mixes (square, round, arch, the
 * gold star). Two rows, so the welcome stays a header and not a hero.
 */
const TILES: Tile[] = [
  { k: "k-data", motif: "dots", shape: "round" },
  { k: "k-res", motif: "book" },
  { k: "k-eng", motif: "rings" },
  { k: "k-gold", motif: "star", shape: "gold" },
  { k: "k-build", motif: "arch", shape: "arch" },
  { k: "k-energy", motif: "wave" },
  { k: "k-it", motif: "window" },
  { k: "k-biz", motif: "bars", shape: "round" },
];

// .mo's 24px corner is sized for the website's big tiles; at 52px it would
// read as a circle, so the corners are set here per shape.
const SHAPE_RADIUS: Record<NonNullable<Tile["shape"]> | "square", string> = {
  square: "rounded-[16px]",
  gold: "rounded-[16px]",
  round: "rounded-full",
  arch: "rounded-t-full rounded-b-[16px]",
};

/**
 * The dashboard's opening: the greeting as the page title and the tile
 * cluster on the right from md up. PageHeader still renders the title, so the
 * document title and heading level stay the same as every other page.
 */
export function WelcomeHeader({ title, description }: { title: string; description: string }) {
  const tiles = useMemo(() => TILES.map((t) => ({ ...t, markup: tileSvg(t.motif) })), []);

  return (
    // The cluster is two 52px rows: the block keeps room for it from md up,
    // so the tiles never run under the stat row below.
    <div className="relative md:min-h-[116px] xl:min-h-[120px]">
      <div className="md:pr-[256px]">
        <PageHeader hideBreadcrumbs title={title} description={description} />
      </div>

      <div aria-hidden className="absolute right-0 top-0 hidden grid-cols-4 gap-2 md:grid">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={cn("mo mo-in w-[52px]", t.k, t.shape === "gold" && "gold", SHAPE_RADIUS[t.shape ?? "square"])}
            style={{ "--i": i } as React.CSSProperties}
          >
            <Svg markup={t.markup} />
          </div>
        ))}
      </div>
    </div>
  );
}
