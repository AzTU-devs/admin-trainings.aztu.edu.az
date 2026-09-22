import { tileSvg } from "@shared/lib/art";
import { cn } from "@shared/lib/cn";
import { Svg } from "./Svg";

/*
 * The website's "periodic table": twelve discipline tiles around the AzTU
 * shield (the sign-in panel and the hero use it). Decorative (aria-hidden) —
 * the colours are the subject families', but the tiles stand for no
 * particular course.
 */

type Tile = { k: string; motif: string; shape?: "round" | "arch" | "gold" } | "SHIELD";

const TILES: Tile[] = [
  { k: "k-it", motif: "window" },
  { k: "k-data", motif: "dots", shape: "round" },
  { k: "k-eng", motif: "rings" },
  { k: "k-res", motif: "book", shape: "arch" },
  { k: "k-build", motif: "arch" },
  "SHIELD",
  { k: "k-biz", motif: "bars" },
  { k: "k-trans", motif: "route", shape: "round" },
  { k: "k-energy", motif: "wave" },
  { k: "k-gold", motif: "star", shape: "gold" },
  { k: "k-build", motif: "stairs" },
  { k: "k-it", motif: "circle", shape: "round" },
  { k: "k-data", motif: "blocks" },
];

function ShieldTile({ i }: { i: number }) {
  return (
    <div className="mo big shield mo-in" style={{ "--i": i } as React.CSSProperties}>
      <span className="ring" />
      <span className="ring2" />
      <span className="tick" style={{ left: "50%", top: "5%", width: 2, height: "6%", marginLeft: -1 }} />
      <span className="tick" style={{ left: "50%", bottom: "5%", width: 2, height: "6%", marginLeft: -1 }} />
      <span className="tick" style={{ top: "50%", left: "5%", height: 2, width: "6%", marginTop: -1 }} />
      <span className="tick" style={{ top: "50%", right: "5%", height: 2, width: "6%", marginTop: -1 }} />
      <img src="/images/logo/aztu-mark-white.png" alt="" />
    </div>
  );
}

/** The 4×4 grid with the shield spanning the middle 2×2. Size it with `className` (a width). */
export function Mosaic({ className }: { className?: string }) {
  return (
    <div className={cn("mosaic", className)} aria-hidden>
      {TILES.map((t, i) =>
        t === "SHIELD" ? (
          <ShieldTile key="shield" i={i} />
        ) : (
          <div key={i} className={cn("mo mo-in", t.k, t.shape)} style={{ "--i": i } as React.CSSProperties}>
            <Svg markup={tileSvg(t.motif)} />
          </div>
        ),
      )}
    </div>
  );
}
