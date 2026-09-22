import { describe, expect, it } from "vitest";
import { roomHue, roomPlan } from "./roomPlan";

const ID = "1668f8f2-5146-4623-aa44-0cf4c9ad504b";

describe("roomPlan", () => {
  it("draws the same plan for the same room", () => {
    expect(roomPlan(ID, 35)).toEqual(roomPlan(ID, 35));
    expect(roomPlan(ID, 35, true)).toEqual(roomPlan(ID, 35, true));
  });

  it("lays a big room out in lecture rows, one desk per seat", () => {
    const plan = roomPlan(ID, 30);
    expect(plan.furniture).toHaveLength(30);
    expect(plan.furniture.every((f) => f.kind === "rect")).toBe(true);
  });

  it("caps the drawn places so huge rooms stay legible", () => {
    expect(roomPlan(ID, 500).furniture.length).toBeLessThanOrEqual(40);
    expect(roomPlan(ID, 500, true).furniture.length).toBeLessThanOrEqual(12);
  });

  it("survives a missing or nonsense capacity", () => {
    for (const cap of [0, -3, Number.NaN]) {
      const plan = roomPlan(ID, cap);
      expect(plan.furniture.length).toBeGreaterThan(0);
      for (const f of plan.furniture) {
        const values = f.kind === "rect" ? [f.x, f.y, f.w, f.h] : [f.cx, f.cy, f.r];
        expect(values.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("keeps furniture inside the room", () => {
    for (const cap of [1, 2, 5, 9, 14, 20, 27, 28, 40]) {
      for (const square of [false, true]) {
        const plan = roomPlan(`${ID}-${cap}`, cap, square);
        const { x, y, w, h } = plan.floor;
        for (const f of plan.furniture) {
          const [l, t, r, b] = f.kind === "rect" ? [f.x, f.y, f.x + f.w, f.y + f.h] : [f.cx - f.r, f.cy - f.r, f.cx + f.r, f.cy + f.r];
          expect(l).toBeGreaterThanOrEqual(x);
          expect(t).toBeGreaterThanOrEqual(y);
          expect(r).toBeLessThanOrEqual(x + w);
          expect(b).toBeLessThanOrEqual(y + h);
        }
      }
    }
  });

  it("gives a room one stable colour", () => {
    expect(roomHue(ID)).toBe(roomHue(ID));
    expect(roomHue(ID)).toMatch(/^k-/);
  });
});
