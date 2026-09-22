import { z } from "zod";
import { LESSON_CONTENT_TYPE } from "@shared/types/lms";

export const lessonSchema = z.object({
  // Trimmed first, so a title of spaces is caught here rather than by the API.
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  // All five stay valid so an existing QUIZ or LIVE_SESSION lesson can still be
  // saved; the editor only offers the three the platform can actually deliver.
  contentType: z.enum([
    LESSON_CONTENT_TYPE.VIDEO,
    LESSON_CONTENT_TYPE.TEXT,
    LESSON_CONTENT_TYPE.PDF,
    LESSON_CONTENT_TYPE.QUIZ,
    LESSON_CONTENT_TYPE.LIVE_SESSION,
  ]),
  /** Set by an upload or a pick from the video library. */
  videoMediaId: z.string().uuid().optional(),
  /**
   * A meeting link or externally hosted video. It had no field at all, and the
   * lesson PUT is a full replacement, so saving any lesson silently erased one
   * set through the API. http(s) only: it is rendered as a link.
   */
  videoUrl: z
    .string()
    .trim()
    .max(512, "At most 512 characters")
    .refine((u) => u === "" || /^https?:\/\/[^\s]+$/i.test(u), "Enter a full http:// or https:// link")
    .optional(),
  durationSeconds: z.number().int().min(0, "Must be ≥ 0"),
  preview: z.boolean(),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
