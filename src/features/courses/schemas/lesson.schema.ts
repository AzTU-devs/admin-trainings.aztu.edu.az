import { z } from "zod";
import { LESSON_CONTENT_TYPE } from "@shared/types/lms";

export const lessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  contentType: z.enum([
    LESSON_CONTENT_TYPE.VIDEO,
    LESSON_CONTENT_TYPE.TEXT,
    LESSON_CONTENT_TYPE.PDF,
    LESSON_CONTENT_TYPE.QUIZ,
    LESSON_CONTENT_TYPE.LIVE_SESSION,
  ]),
  /** Set by uploading a file through the dropzone (drag & drop). */
  videoMediaId: z.string().uuid().optional(),
  durationSeconds: z.number().int().min(0, "Must be ≥ 0"),
  preview: z.boolean(),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
