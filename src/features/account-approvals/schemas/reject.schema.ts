import { z } from "zod";

/** The API's rule for a rejection's reason: 1–500 characters once trimmed. */
export const ACCOUNT_REJECT_REASON_MAX = 500;

export const rejectAccountSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Say why the sign-up is rejected; the person is e-mailed this reason")
    .max(ACCOUNT_REJECT_REASON_MAX, `At most ${ACCOUNT_REJECT_REASON_MAX} characters`),
});

export type RejectAccountFormValues = z.infer<typeof rejectAccountSchema>;
