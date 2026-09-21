import { z } from "zod";

export const addParticipantSchema = z.object({
  email: z.string().email("Enter a valid email").max(255),
});

export type AddParticipantFormValues = z.infer<typeof addParticipantSchema>;
