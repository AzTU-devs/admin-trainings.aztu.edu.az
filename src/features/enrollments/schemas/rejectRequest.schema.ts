import { z } from "zod";

/** The API's rule for an enrolment rejection's reason: optional, at most 500 characters. */
export const REQUEST_REJECT_REASON_MAX = 500;

export const rejectRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(REQUEST_REJECT_REASON_MAX, `At most ${REQUEST_REJECT_REASON_MAX} characters`),
});

export type RejectRequestFormValues = z.infer<typeof rejectRequestSchema>;
