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
 * Schedule for an OFFLINE course.
 *
 * Every field is optional at this level and the real rules are applied in the
 * `superRefine` below, which only runs them when the course is actually
 * OFFLINE. Otherwise switching the type to Online with a half-filled schedule
 * would block the form on fields the backend is going to reject anyway.
 */
const offlineDetailsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  weeklyHours: z.number().min(0).optional(),
  totalHours: z.number().min(0).optional(),
  studentLimit: z.number().int().min(0).optional(),
  city: z.string().max(120).optional(),
  addressLine: z.string().max(255).optional(),
});

export const courseSchema = z
  .object({
    slug: z
      .string()
      .min(3, "Slug is required")
      .max(160)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
    title: z.string().min(3, "Title is required").max(160),
    subtitle: z.string().max(255).optional(),
    description: z.string().max(20_000).optional(),
    requirements: z.string().max(5_000).optional(),
    learningOutcomes: z.string().max(5_000).optional(),
    syllabus: z.string().max(20_000).optional(),
    courseType: z.enum([COURSE_TYPE.ONLINE, COURSE_TYPE.OFFLINE]),
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
    categoryIds: z.array(z.string().uuid("Must be a UUID")).min(1, "At least one category"),
    thumbnailMediaId: z.string().uuid().optional(),
    trailerMediaId: z.string().uuid().optional(),
    onlineDetails: onlineDetailsSchema.optional(),
    offlineDetails: offlineDetailsSchema.optional(),
  })
  // Mirrors CourseService.validateTypeSpecific on the backend, so an offline
  // course is caught here rather than coming back as OFFLINE_DETAILS_REQUIRED.
  // The backend also dereferences both dates without a null check, so leaving
  // one blank would be a 500 rather than a validation error.
  .superRefine((v, ctx) => {
    if (v.courseType !== COURSE_TYPE.OFFLINE) return;

    const d = v.offlineDetails;
    if (!d?.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["offlineDetails", "startDate"],
        message: "Start date is required for an offline course",
      });
    }
    if (!d?.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["offlineDetails", "endDate"],
        message: "End date is required for an offline course",
      });
    }
    // ISO yyyy-MM-dd sorts lexicographically, so a string compare is correct.
    if (d?.startDate && d?.endDate && d.endDate < d.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["offlineDetails", "endDate"],
        message: "End date must be on or after the start date",
      });
    }
    if (!d?.studentLimit || d.studentLimit < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["offlineDetails", "studentLimit"],
        message: "Seat limit must be at least 1",
      });
    }
  });

export type CourseFormValues = z.infer<typeof courseSchema>;
