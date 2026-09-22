import { hash } from "@shared/lib/art";
import { hueFor } from "@shared/lib/hue";
import type { HueClass } from "@shared/lib/categoryStyle";

/*
 * A room's generated picture when it has no photo: a drafted floor plan in the
 * room's colour field — walls with a door swing, the board at the front, and
 * the furniture laid out for the room's capacity. Same drawing language as the
 * website's covers and location map (grid paper, paint roles, one gold dot),
 * so rooms sit next to courses without looking borrowed from a category.
 *
 * Pure geometry: the component (RoomVisual) turns it into SVG with the paint
 * classes from index.css (f0 … f900, fg), which re-theme for night mode.
 */

/**
 * The colour family a room is drawn in. Keyed by the room id so a room keeps
 * its colour on every page — the rooms list, pricing, and the booking queues
 * (bookings carry `roomId`, not the building).
 */
export const roomHue = (roomId: string): HueClass => hueFor(roomId);

export type PlanShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number; paint: string }
  | { kind: "circle"; cx: number; cy: number; r: number; paint: string };

export interface RoomPlanGeometry {
  /** viewBox width / height. */
  w: number;
  h: number;
  grid: string;
  /** Soft shape behind the room (the covers' "pa" layer). */
  backdrop: PlanShape;
  floor: { x: number; y: number; w: number; h: number };
  walls: string;
  doorLeaf: string;
  doorSwing: string;
  windows: PlanShape[];
  board: PlanShape;
  lectern: PlanShape;
  furniture: PlanShape[];
  dim?: { path: string; x: number; y: number; label: string };
}

/* deterministic PRNG (same recipe as the website's art) */
function rng(seed: number): () => number {
  let t = (seed >>> 0) + 0x9e3779b9;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gridPath(w: number, h: number, step: number): string {
  let d = "";
  for (let x = step; x < w; x += step) d += `M${x} 0V${h}`;
  for (let y = step; y < h; y += step) d += `M0 ${y}H${w}`;
  return d;
}

/** A rounded-corner wall outline with a door gap on the bottom wall, from `gapA` to `gapB`. */
function wallPath(x: number, y: number, w: number, h: number, r: number, gapA: number, gapB: number): string {
  const R = x + w;
  const B = y + h;
  return (
    `M${gapB} ${B}H${R - r}A${r} ${r} 0 0 0 ${R} ${B - r}V${y + r}A${r} ${r} 0 0 0 ${R - r} ${y}` +
    `H${x + r}A${r} ${r} 0 0 0 ${x} ${y + r}V${B - r}A${r} ${r} 0 0 0 ${x + r} ${B}H${gapA}`
  );
}

type Box = { x: number; y: number; w: number; h: number };

/** Lecture rows: `n` desks in a centred grid, the last row centred too. */
function rows(n: number, box: Box, maxCols: number, r: () => number): PlanShape[] {
  const cols = Math.max(2, Math.min(maxCols, Math.round(Math.sqrt(n * 2.2))));
  const lines = Math.max(1, Math.ceil(n / cols));
  const gx = box.w > 150 ? 8 : 5;
  const gy = box.h > 70 ? 9 : 6;
  const dw = (box.w - (cols - 1) * gx) / cols;
  const dh = Math.min(box.w > 150 ? 13 : 9, (box.h - (lines - 1) * gy) / lines);
  const used = lines * dh + (lines - 1) * gy;
  const top = box.y + (box.h - used) / 2;
  const accent = Math.floor(r() * n);
  const out: PlanShape[] = [];
  for (let i = 0; i < n; i++) {
    const line = Math.floor(i / cols);
    const inLine = line === lines - 1 ? n - line * cols : cols;
    const col = i % cols;
    const left = box.x + (box.w - (inLine * dw + (inLine - 1) * gx)) / 2;
    out.push({
      kind: "rect",
      x: left + col * (dw + gx),
      y: top + line * (dh + gy),
      w: dw,
      h: dh,
      r: Math.min(4, dh / 2),
      paint: i === accent ? "f500" : "f300",
    });
  }
  return out;
}

/** Seminar: one long table with `n` chairs around it. */
function boardroom(n: number, box: Box): PlanShape[] {
  const tw = box.w * 0.62;
  const th = Math.min(box.h * 0.42, 34);
  const tx = box.x + (box.w - tw) / 2;
  const ty = box.y + (box.h - th) / 2;
  const out: PlanShape[] = [{ kind: "rect", x: tx, y: ty, w: tw, h: th, r: th / 2, paint: "f200" }];
  const side = Math.max(1, Math.ceil((n - 2) / 2));
  const cr = Math.min(5, (tw / side) * 0.3);
  for (let i = 0; i < n - 2 && i < side * 2; i++) {
    const top = i < side;
    const k = top ? i : i - side;
    const count = top ? side : n - 2 - side;
    const step = tw / (count + 1);
    out.push({ kind: "circle", cx: tx + step * (k + 1), cy: top ? ty - cr - 4 : ty + th + cr + 4, r: cr, paint: "f300" });
  }
  // One chair at each end of the table.
  out.push({ kind: "circle", cx: tx - cr - 4, cy: ty + th / 2, r: cr, paint: "f500" });
  if (n > 1) out.push({ kind: "circle", cx: tx + tw + cr + 4, cy: ty + th / 2, r: cr, paint: "f300" });
  return out;
}

/** Group work: round tables of four. */
function islands(n: number, box: Box): PlanShape[] {
  const tables = Math.max(1, Math.ceil(n / 4));
  const cols = Math.min(tables, box.w > 150 ? 4 : 2);
  const lines = Math.ceil(tables / cols);
  const cellW = box.w / cols;
  const cellH = box.h / lines;
  const tr = Math.min(cellW, cellH) * 0.22;
  const out: PlanShape[] = [];
  let seats = n;
  for (let t = 0; t < tables; t++) {
    const line = Math.floor(t / cols);
    const inLine = line === lines - 1 ? tables - line * cols : cols;
    const offset = (box.w - inLine * cellW) / 2;
    const cx = box.x + offset + (t % cols) * cellW + cellW / 2;
    const cy = box.y + line * cellH + cellH / 2;
    out.push({ kind: "circle", cx, cy, r: tr, paint: t === 0 ? "f500" : "f200" });
    const here = Math.min(4, seats);
    seats -= here;
    const d = tr + Math.max(3.5, tr * 0.55);
    const spots: [number, number][] = [[0, -d], [d, 0], [0, d], [-d, 0]];
    for (let s = 0; s < here; s++) {
      out.push({ kind: "circle", cx: cx + spots[s][0], cy: cy + spots[s][1], r: Math.max(2.5, tr * 0.36), paint: "f300" });
    }
  }
  return out;
}

const LABELS = ["1:50", "1:100", "±0.00"];

/**
 * The plan for one room. `seed` is the room id (the same room always gets the
 * same drawing); `square` is the compact version for 44–64px thumbnails.
 */
export function roomPlan(seed: string, capacity: number, square = false): RoomPlanGeometry {
  const r = rng(hash(seed || "room"));
  const seats = Math.max(1, Number.isFinite(capacity) ? Math.round(capacity) : 1);
  // The layout follows the real capacity, so a room's thumbnail and its cover
  // show the same arrangement: lecture rows for big rooms, a seminar table or
  // group tables for small ones.
  const layout = seats >= 28 ? 0 : seats <= 14 ? Math.floor(r() * 3) : Math.floor(r() * 2) * 2; // 0 rows, 1 table, 2 islands
  // Draw at most 40 places (12 on a thumbnail): past that the plan only gets
  // denser, not clearer.
  const cap = Math.min(seats, square ? 12 : 40);

  if (square) {
    const floor = { x: 10, y: 10, w: 100, h: 100 };
    const box: Box = { x: 22, y: 38, w: 76, h: 52 };
    const furniture = layout === 1 ? boardroom(Math.min(cap, 10), box) : layout === 2 ? islands(Math.min(cap, 8), box) : rows(cap, box, 4, r);
    return {
      w: 120,
      h: 120,
      grid: gridPath(120, 120, 20),
      backdrop: r() > 0.5
        ? { kind: "circle", cx: 114, cy: 6, r: 40, paint: "f200" }
        : { kind: "circle", cx: 4, cy: 118, r: 44, paint: "f200" },
      floor,
      walls: wallPath(floor.x, floor.y, floor.w, floor.h, 10, 20, 38),
      doorLeaf: "M20 110V92",
      doorSwing: "M20 92A18 18 0 0 1 38 110",
      windows: [],
      board: { kind: "rect", x: 36, y: 17, w: 48, h: 6, r: 3, paint: "f700" },
      lectern: { kind: "circle", cx: 60, cy: 30, r: 4.5, paint: "fg" },
      furniture,
    };
  }

  const floor = { x: 48, y: 30, w: 224, h: 140 };
  const box: Box = { x: 66, y: 70, w: 188, h: 74 };
  const furniture = layout === 1 ? boardroom(cap, box) : layout === 2 ? islands(cap, box) : rows(cap, box, 8, r);
  const backdrops: PlanShape[] = [
    { kind: "circle", cx: 292, cy: 26, r: 64, paint: "f200" },
    { kind: "circle", cx: 26, cy: 178, r: 70, paint: "f200" },
    { kind: "rect", x: 196, y: -40, w: 150, h: 150, r: 75, paint: "f200" },
  ];
  const label = LABELS[Math.floor(r() * LABELS.length)];
  return {
    w: 320,
    h: 200,
    grid: gridPath(320, 200, 20),
    backdrop: backdrops[Math.floor(r() * backdrops.length)],
    floor,
    walls: wallPath(floor.x, floor.y, floor.w, floor.h, 12, 64, 88),
    doorLeaf: "M64 170V146",
    doorSwing: "M64 146A24 24 0 0 1 88 170",
    windows: [0, 1, 2].map((i) => ({ kind: "rect", x: 268.5, y: 50 + i * 38, w: 7, h: 24, r: 3.5, paint: "f300" })),
    board: { kind: "rect", x: 112, y: 38, w: 96, h: 7, r: 3.5, paint: "f700" },
    lectern: { kind: "circle", cx: 160, cy: 58, r: 6, paint: "fg" },
    furniture,
    dim: { path: "M48 190H272M48 185V195M272 185V195", x: 160, y: 185, label },
  };
}
