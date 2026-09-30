import { z } from "zod";
import { COURSE_LEVEL, COURSE_TYPE } from "@shared/types/lms";

/**
 * Options the backend stores for an ONLINE course. `totalVideoSeconds` is
 * derived from the lessons, so it is not collected here.
 */
const onlineDetailsSchema = z.object({
  hasCertificate: z.boolean(),
  dripEnabled: z.boolean(),
});

/**
 * Schedule for an in-person course: OFFLINE (a date range) or ONE_TIME (one
 * date with a start and end time).
 *
 * Every field is optional at this level and the real rules are applied in the
 * `superRefine` below, which only runs them for the type actually chosen.
 * Otherwise switching the type to Online with a half-filled schedule would
 * block the form on fields the backend is going to reject anyway.
 *
 * `nullish`, not `optional`: the API returns `null` for every unset field, and
 * an edit form loaded from it used to fail here with zod's bare "Invalid input:
 * expected number, received null" — without a request ever leaving the browser.
 */
const offlineDetailsSchema = z.object({
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  weeklyHours: z.number().min(0).max(168, "At most 168 hours a week").nullish(),
  totalHours: z.number().min(0).max(99_999.9).nullish(),
  studentLimit: z.number().int().min(0).nullish(),
  // The columns are VARCHAR(80) / VARCHAR(255).
  city: z.string().max(80, "At most 80 characters").nullish(),
  addressLine: z.string().max(255, "At most 255 characters").nullish(),
});

/**
 * One syllabus entry. The limits are the API's; the description is the
 * editor's HTML, so its cap counts markup — generous enough for a long entry.
 */
const syllabusItemSchema = z.object({
  title: z.string().trim().min(1, "Give this item a title").max(200, "At most 200 characters"),
  description: z.string().max(20_000, "This description is too long").optional(),
});

/**
 * Any 8-4-4-4-12 hex id. The ids are the server's own, so this only guards the
 * shape; zod's strict RFC `uuid()` would refuse a hand-seeded
 * 00000000-…-000000000001 row that the API itself accepts.
 */
const id = z.guid("Must be an id");

/** The API counts the stored HTML against these limits, markup included. */
const richText = (max: number) => z.string().max(max, "This text is too long — shorten it or remove formatting").nullish();

export const courseSchema = z
  .object({
    slug: z
      .string()
      .min(3, "Slug is required")
      .max(160)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
    title: z.string().min(3, "Title is required").max(160),
    subtitle: z.string().max(255).nullish(),
    description: richText(20_000),
    requirements: richText(20_000),
    learningOutcomes: richText(20_000),
    syllabusItems: z.array(syllabusItemSchema).max(100, "At most 100 syllabus items"),
    courseType: z.enum([COURSE_TYPE.ONLINE, COURSE_TYPE.OFFLINE, COURSE_TYPE.ONE_TIME]),
    level: z.enum([
      COURSE_LEVEL.BEGINNER,
      COURSE_LEVEL.INTERMEDIATE,
      COURSE_LEVEL.ADVANCED,
      COURSE_LEVEL.ALL,
    ]),
    language: z.string().min(2).max(8),
    free: z.boolean(),
    price: z.number().min(0, "Price must be ≥ 0"),
    currency: z.string().length(3, "3-letter code (e.g. AZN)"),
    categoryIds: z.array(id).min(1, "At least one category"),
    thumbnailMediaId: id.nullish(),
    trailerMediaId: id.nullish(),
    onlineDetails: onlineDetailsSchema.optional(),
    offlineDetails: offlineDetailsSchema.optional(),
  })
  // Mirrors CourseService.validateTypeSpecific on the backend, so an in-person
  // course is caught here rather than coming back as a 400 after the round trip.
  .superRefine((v, ctx) => {
    const d = v.offlineDetails;
    const issue = (field: keyof NonNullable<typeof d>, message: string) =>
      ctx.addIssue({ code: "custom", path: ["offlineDetails", field], message });

    if (v.courseType === COURSE_TYPE.OFFLINE) {
      if (!d?.startDate) issue("startDate", "Start date is required for an offline course");
      if (!d?.endDate) issue("endDate", "End date is required for an offline course");
      // ISO yyyy-MM-dd sorts lexicographically, so a string compare is correct.
      if (d?.startDate && d?.endDate && d.endDate < d.startDate) {
        issue("endDate", "End date must be on or after the start date");
      }
      // Daily session times are optional for a multi-day course, but a range
      // that is given has to run forwards. "HH:mm" also compares as a string.
      if (d?.startTime && d?.endTime && d.endTime.slice(0, 5) <= d.startTime.slice(0, 5)) {
        issue("endTime", "End time must be after the start time");
      }
    } else if (v.courseType === COURSE_TYPE.ONE_TIME) {
      if (!d?.startDate) issue("startDate", "Pick the date of the training");
      if (!d?.startTime) issue("startTime", "Start time is required");
      if (!d?.endTime) issue("endTime", "End time is required");
      if (d?.startTime && d?.endTime && d.endTime.slice(0, 5) <= d.startTime.slice(0, 5)) {
        issue("endTime", "End time must be after the start time");
      }
    } else {
      return;
    }

    if (!d?.studentLimit || d.studentLimit < 1) {
      issue("studentLimit", "Seat limit must be at least 1");
    }
  });

export type CourseFormValues = z.infer<typeof courseSchema>;
export type SyllabusItemValues = z.infer<typeof syllabusItemSchema>;

/** Length of a one-time session in hours (1 decimal), or null while the times are incomplete. */
export function sessionHours(startTime?: string | null, endTime?: string | null): number | null {
  if (!startTime || !endTime) return null;
  const minutes = (t: string) => {
    const [h, m] = t.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const diff = minutes(endTime) - minutes(startTime);
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return Math.round((diff / 60) * 10) / 10;
}
