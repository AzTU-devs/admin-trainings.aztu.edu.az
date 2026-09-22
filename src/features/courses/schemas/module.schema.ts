import { z } from "zod";

export const moduleSchema = z.object({
  // Trimmed first, so a title of spaces is caught here rather than by the API.
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().max(2000).optional(),
});

export type ModuleFormValues = z.infer<typeof moduleSchema>;
