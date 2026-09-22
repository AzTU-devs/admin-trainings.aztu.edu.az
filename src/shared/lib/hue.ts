import { hash } from "./art";
import type { HueClass } from "./categoryStyle";

/**
 * Families for things that have no subject of their own — a person's avatar,
 * a stat card. Red (k-trans) is left out: on a person or a number it reads as
 * an error.
 */
export const PERSON_HUES: readonly HueClass[] = [
  "k-data",
  "k-eng",
  "k-build",
  "k-it",
  "k-biz",
  "k-res",
  "k-energy",
  "k-navy",
];

/**
 * A stable hue class for any string (an id, a name, a label): the same input
 * always gets the same colour, on every page and every visit.
 */
export function hueFor(seed: string | null | undefined, palette: readonly HueClass[] = PERSON_HUES): HueClass {
  if (!seed) return "k-navy";
  return palette[hash(seed) % palette.length];
}

/**
 * Up to two initials, safe for Azerbaijani names.
 *
 * The dotted and dotless i are mapped by hand: `"i".toUpperCase()` is "I"
 * (so "ilkin" would read as "Ilkin"), and toLocaleUpperCase("az") depends on
 * locale data the browser may not have. Same rule as the public website.
 */
export function initialsOf(name: string | null | undefined, max = 2): string {
  const letters = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word)[0] ?? "")
    .filter(Boolean)
    .slice(0, max)
    .join("");
  return letters.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
}
