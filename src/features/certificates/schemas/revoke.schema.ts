import { z } from "zod";

/** The API's rule for a revocation's reason: 1–500 characters once trimmed. */
export const REVOKE_REASON_MAX = 500;

export const revokeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Say why the certificate is revoked")
    .max(REVOKE_REASON_MAX, `At most ${REVOKE_REASON_MAX} characters`),
});

export type RevokeFormValues = z.infer<typeof revokeSchema>;
