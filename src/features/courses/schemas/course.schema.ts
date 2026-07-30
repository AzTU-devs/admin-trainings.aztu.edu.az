import { z } from "zod";
import { COURSE_LEVEL, COURSE_TYPE } from "@shared/types/lms";

export const courseSchema = z.object({
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
});

export type CourseFormValues = z.infer<typeof courseSchema>;
