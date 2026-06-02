import { z } from "zod";

export const moduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(160),
  description: z.string().max(2000).optional(),
});

export type ModuleFormValues = z.infer<typeof moduleSchema>;
