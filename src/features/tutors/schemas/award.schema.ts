import { z } from "zod";
import type { UUID } from "@shared/types/lms";
import type { CreateAwardRequest } from "@features/tutors/types";
import { ENTRY_LIMITS } from "@features/tutors/schemas/expertProfile.schema";

/** The API refuses a 31st award with 400 AWARD_LIMIT. */
export const AWARD_LIMIT = 30;

/**
 * The "Add award" dialog: the name in both languages — the public page shows
 * the one in its own — and an optional PDF or image, uploaded on submit. The
 * API trims the names and wants each 1–200 characters after that.
 */
export const awardSchema = z
  .object({
    nameAz: z.string(),
    nameEn: z.string(),
    file: z.custom<File | undefined>(),
  })
  .superRefine((values, ctx) => {
    const name = (path: "nameAz" | "nameEn", missing: string) => {
      const text = values[path].trim();
      if (!text) ctx.addIssue({ code: "custom", path: [path], message: missing });
      else if (text.length > ENTRY_LIMITS.nameLength) {
        ctx.addIssue({ code: "custom", path: [path], message: `At most ${ENTRY_LIMITS.nameLength} characters` });
      }
    };
    name("nameAz", "Enter the award's name in Azerbaijani");
    name("nameEn", "Enter the award's name in English");
  });

export type AwardFormValues = z.infer<typeof awardSchema>;

export const EMPTY_AWARD: AwardFormValues = { nameAz: "", nameEn: "", file: undefined };

/** The POST body: the names trimmed, and the file's id only when there is one. */
export function toCreateAwardRequest(values: AwardFormValues, mediaId: UUID | null): CreateAwardRequest {
  return {
    nameAz: values.nameAz.trim(),
    nameEn: values.nameEn.trim(),
    ...(mediaId ? { mediaId } : {}),
  };
}
