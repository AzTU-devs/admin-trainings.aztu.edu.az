import type { ArtKind } from "./art";

/**
 * Which colour family and which drawing a category gets — ported from the
 * public website (src/features/category/style.ts), so a category is the same
 * colour in the dashboard as in the catalogue.
 *
 * `k` is the hue-engine class (src/index.css, "Category hue engine"): every
 * shade a tile, cover or label uses is derived from one hue per family. `art`
 * picks the family's motifs in ./art.ts.
 */
export type HueClass =
  | "k-it"
  | "k-data"
  | "k-eng"
  | "k-biz"
  | "k-res"
  | "k-build"
  | "k-trans"
  | "k-energy"
  | "k-navy"
  | "k-gold";

export type CategoryStyle = { k: HueClass; art: ArtKind };

/** The subject families a category can match (everything but the neutral `brand`). */
type SubjectKind = Exclude<ArtKind, "brand">;

/** The categories that exist today, by slug. */
const BY_SLUG: Record<string, SubjectKind> = {
  "information-technology": "it",
  "data-ai": "data",
  engineering: "eng",
  "business-and-management": "biz",
  "research-academic-skills": "res",
  "construction-architecture": "build",
  "transport-logistics": "trans",
};

/**
 * Categories added later in the dashboard have no entry above, so they are
 * matched by what their slug and name say. Order matters: "data" must win over
 * "information" for a slug like "data-information-systems".
 */
const KEYWORDS: [RegExp, SubjectKind][] = [
  [/energ|ekolog|ecolog|solar|power|günəş/i, "energy"],
  [/data|\bai\b|süni|machine|intellekt/i, "data"],
  [/inform|software|program|web|cyber|kibert|comput|kompüter/i, "it"],
  [/engineer|mühəndis|mechan|mexanik|electr|elektr/i, "eng"],
  [/business|biznes|manage|idarə|finan|maliyy|econom|iqtisad|market/i, "biz"],
  [/research|tədqiq|academ|akadem|scien|elm/i, "res"],
  [/construct|tikinti|archit|memar|build|inşaat/i, "build"],
  [/transport|nəqliyyat|logist|avia|marine|dəniz/i, "trans"],
];

/** A category (or anything with a slug and a name) → its hue class and motif family. */
export function categoryStyle(
  category: { slug?: string | null; name?: string | null } | null | undefined,
): CategoryStyle {
  if (!category) return NEUTRAL;
  const slug = category.slug ?? "";
  const known = BY_SLUG[slug];
  if (known) return { k: `k-${known}`, art: known };
  const text = `${slug} ${category.name ?? ""}`;
  for (const [re, art] of KEYWORDS) if (re.test(text)) return { k: `k-${art}`, art };
  // Nothing matched: the brand navy field with AzTU's own motifs, rather than
  // borrowing another category's colour or glyph and implying they are
  // related. (The website draws the IT window here; in the dashboard that
  // made every unmatched category read as "Information Technology".)
  return NEUTRAL;
}

/** No category, or one that matches no family: navy field, neutral `brand` art. */
const NEUTRAL: CategoryStyle = { k: "k-navy", art: "brand" };

/** The single-shape motif each family uses on tiles, swatches and the mosaic. */
export const TILE_MOTIF: Record<ArtKind, string> = {
  it: "window",
  data: "dots",
  eng: "gear",
  biz: "bars",
  res: "book",
  build: "arch",
  trans: "route",
  energy: "wave",
  // One of several by seed — see tileMotif() in ./art.ts.
  brand: "shield",
};
