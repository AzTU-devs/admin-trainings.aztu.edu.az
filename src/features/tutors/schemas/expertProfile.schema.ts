import { z } from "zod";
import type { UUID } from "@shared/types/lms";
import type { TutorProfileDto, UpdateTutorProfileRequest } from "@features/tutors/types";

/**
 * The expert profile form, shared by a tutor editing their own profile and an
 * admin editing anyone's. Caps follow the `tutor_profiles` columns; the API
 * enforces the same ones, so these only move the failure to before the save.
 */

const WEB_ADDRESS_MESSAGE = "Enter a full address starting with https://";

/**
 * An absolute http(s) address with a real host, as the API's HttpUrl check has
 * it. The prefix is checked on the raw text because `new URL` quietly repairs
 * "https:example.com" into a valid URL that the API would still refuse. Embedded
 * credentials are refused on both sides: "https://linkedin.com@evil.example"
 * reads as LinkedIn and goes somewhere else.
 */
function isWebAddress(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.includes(".") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

const optionalWebAddress = z
  .string()
  .max(255, "At most 255 characters")
  .refine((v) => v.trim() === "" || isWebAddress(v.trim()), WEB_ADDRESS_MESSAGE);

const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/**
 * The bare `0000-0000-0000-000X` form the API stores. People usually paste the
 * orcid.org link instead, so the prefix is dropped rather than refused.
 */
export function normalizeOrcid(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?orcid\.org\//i, "")
    .toUpperCase();
}

/**
 * ORCID's own check digit (ISO 7064 MOD 11-2). The API checks only the shape, so
 * without this a single mistyped digit would publish a link to someone else's
 * record — or to nothing.
 */
function hasValidOrcidChecksum(orcid: string): boolean {
  const digits = orcid.replace(/-/g, "");
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(digits[i])) * 2;
  const result = (12 - (total % 11)) % 11;
  return digits[15] === (result === 10 ? "X" : String(result));
}

/** The expert's own areas, as the API caps them: how many, and how long each may be. */
export const OWN_AREA_LIMITS = { count: 10, minLength: 2, maxLength: 60 } as const;

/** The API's words for a profile left with no area at all (400 EXPERTISE_REQUIRED). */
export const AREAS_REQUIRED_MESSAGE = "Choose at least one area of expertise or add your own";

/** An own area as the API stores it: trimmed, each run of whitespace one space. */
export function normalizeOwnArea(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Markup brackets and control characters, which the API refuses in an own area. */
function hasForbiddenCharacters(value: string): boolean {
  if (/[<>]/.test(value)) return true;
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/** What is wrong with one (normalised) own area on its own, or null. */
export function ownAreaTextProblem(area: string): string | null {
  if (hasForbiddenCharacters(area)) return "Plain text only, without < or >";
  if (area.length < OWN_AREA_LIMITS.minLength) return `At least ${OWN_AREA_LIMITS.minLength} characters`;
  if (area.length > OWN_AREA_LIMITS.maxLength) return `At most ${OWN_AREA_LIMITS.maxLength} characters`;
  return null;
}

/**
 * Why `raw` cannot join the expert's own areas, or null when it can. Mirrors
 * the API's rules so the expert hears them while typing: the count, the text
 * itself, a duplicate of an area already added (ignoring case), and the name
 * of a category already picked from the list — which the API would drop.
 */
export function ownAreaProblem(
  raw: string,
  current: readonly string[],
  pickedCategoryNames: readonly string[] = [],
): string | null {
  const area = normalizeOwnArea(raw);
  if (!area) return "Type an area first";
  if (current.length >= OWN_AREA_LIMITS.count) return `At most ${OWN_AREA_LIMITS.count} areas of your own`;
  const text = ownAreaTextProblem(area);
  if (text) return text;
  const key = area.toLowerCase();
  if (current.some((a) => normalizeOwnArea(a).toLowerCase() === key)) return "Already added";
  if (pickedCategoryNames.some((n) => normalizeOwnArea(n).toLowerCase() === key)) {
    return "Already picked from the list above";
  }
  return null;
}

export const expertProfileSchema = z.object({
  // Set only from an upload response, never typed, so a format check here could
  // only ever block the form over a field nobody can edit by hand.
  avatarMediaId: z.string().optional(),
  headline: z.string().max(160, "At most 160 characters"),
  academicTitle: z.string().max(120, "At most 120 characters"),
  department: z.string().max(160, "At most 160 characters"),
  bio: z.string().max(5_000, "At most 5,000 characters"),
  yearsExperience: z
    .number()
    .int("Whole years only")
    .min(0, "Can't be negative")
    .max(80, "At most 80 years")
    .optional(),
  languages: z.string().max(255, "At most 255 characters"),
  education: z.string().max(5_000, "At most 5,000 characters"),
  certifications: z.string().max(5_000, "At most 5,000 characters"),
  // At least one area in total — a category or an own area — is checked on the
  // whole object below, so either list may be empty on its own.
  expertiseCategoryIds: z.array(z.string()),
  customExpertise: z
    .array(z.string())
    .max(OWN_AREA_LIMITS.count, `At most ${OWN_AREA_LIMITS.count} areas of your own`)
    .superRefine((areas, ctx) => {
      const seen = new Set<string>();
      for (const raw of areas) {
        const area = normalizeOwnArea(raw);
        const problem = ownAreaTextProblem(area) ?? (seen.has(area.toLowerCase()) ? "Listed twice" : null);
        if (problem) {
          ctx.addIssue({ code: "custom", message: `“${area}”: ${problem.charAt(0).toLowerCase()}${problem.slice(1)}` });
          return;
        }
        seen.add(area.toLowerCase());
      }
    }),
  websiteUrl: optionalWebAddress,
  linkedinUrl: optionalWebAddress,
  googleScholarUrl: optionalWebAddress,
  researchGateUrl: optionalWebAddress,
  githubUrl: optionalWebAddress,
  orcid: z.string().superRefine((raw, ctx) => {
    const orcid = normalizeOrcid(raw);
    if (orcid === "") return;
    if (!ORCID_PATTERN.test(orcid)) {
      ctx.addIssue({ code: "custom", message: "Use the 16-digit form 0000-0000-0000-000X" });
      return;
    }
    if (!hasValidOrcidChecksum(orcid)) {
      ctx.addIssue({ code: "custom", message: "This ORCID iD doesn't check out — look for a mistyped digit" });
    }
  }),
}).superRefine((values, ctx) => {
  // Shown under the category picker, where the areas start. Zod runs this even
  // while other fields have errors, so it is never hidden behind a bad link.
  if (values.expertiseCategoryIds.length === 0 && values.customExpertise.length === 0) {
    ctx.addIssue({ code: "custom", path: ["expertiseCategoryIds"], message: AREAS_REQUIRED_MESSAGE });
  }
});

export type ExpertProfileFormValues = z.infer<typeof expertProfileSchema>;

/** Names of the form's fields, for routing the API's per-field messages onto them. */
export const EXPERT_PROFILE_FIELDS: ReadonlySet<string> = new Set(Object.keys(expertProfileSchema.shape));

/** Single-line text fields, compared and sent trimmed. */
const SINGLE_LINE_FIELDS = [
  "headline",
  "academicTitle",
  "department",
  "languages",
  "websiteUrl",
  "linkedinUrl",
  "googleScholarUrl",
  "researchGateUrl",
  "githubUrl",
] as const;

/** Free-text lists the public page shows one entry per line. */
const LINE_LIST_FIELDS = ["education", "certifications"] as const;

/** One entry per line: blank lines and stray spaces would only render as empty bullets. */
function normalizeLines(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function sameIds(a: readonly UUID[], b: readonly UUID[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Same entries in the same order: the order an expert adds their areas in is the order they are shown in. */
function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** The editable copy of a saved profile. The API sends null for unset fields, hence `??`. */
export function toFormValues(p: TutorProfileDto): ExpertProfileFormValues {
  return {
    avatarMediaId: p.avatarMediaId ?? undefined,
    headline: p.headline ?? "",
    academicTitle: p.academicTitle ?? "",
    department: p.department ?? "",
    bio: p.bio ?? "",
    yearsExperience: p.yearsExperience ?? undefined,
    languages: p.languages ?? "",
    education: p.education ?? "",
    certifications: p.certifications ?? "",
    expertiseCategoryIds: p.expertiseCategoryIds ?? [],
    // Absent from an API build that predates the field: no own areas.
    customExpertise: p.customExpertise ?? [],
    websiteUrl: p.websiteUrl ?? "",
    linkedinUrl: p.linkedinUrl ?? "",
    googleScholarUrl: p.googleScholarUrl ?? "",
    researchGateUrl: p.researchGateUrl ?? "",
    githubUrl: p.githubUrl ?? "",
    orcid: p.orcid ?? "",
  };
}

/**
 * The merge patch for what actually changed since `saved`.
 *
 * Only changed keys are sent: the API leaves absent ones alone, so an untouched
 * field can neither be clobbered by a stale copy (another admin may have edited
 * it meanwhile) nor fail validation on a value that predates the URL rules. A
 * field emptied on purpose is how it gets cleared: "" for text, null for the
 * photo and the years.
 */
export function toUpdateRequest(
  values: ExpertProfileFormValues,
  saved: TutorProfileDto,
): UpdateTutorProfileRequest {
  const body: UpdateTutorProfileRequest = {};

  for (const key of SINGLE_LINE_FIELDS) {
    const next = values[key].trim();
    if (next !== (saved[key] ?? "").trim()) body[key] = next;
  }
  for (const key of LINE_LIST_FIELDS) {
    const next = normalizeLines(values[key]);
    if (next !== normalizeLines(saved[key] ?? "")) body[key] = next;
  }

  // Paragraph breaks are the point of a bio, so it is only trimmed at the ends.
  const bio = values.bio.trim();
  if (bio !== (saved.bio ?? "").trim()) body.bio = bio;

  const orcid = normalizeOrcid(values.orcid);
  if (orcid !== normalizeOrcid(saved.orcid ?? "")) body.orcid = orcid;

  const years = values.yearsExperience ?? null;
  if (years !== (saved.yearsExperience ?? null)) body.yearsExperience = years;

  if (!sameIds(values.expertiseCategoryIds, saved.expertiseCategoryIds ?? [])) {
    body.expertiseCategoryIds = values.expertiseCategoryIds;
  }

  // The whole list replaces the stored one, and [] clears it — so it is sent
  // only when it differs, like the categories.
  const own = values.customExpertise.map(normalizeOwnArea).filter(Boolean);
  if (!sameList(own, saved.customExpertise ?? [])) body.customExpertise = own;

  const avatar = values.avatarMediaId ?? null;
  if (avatar !== (saved.avatarMediaId ?? null)) body.avatarMediaId = avatar;

  return body;
}
