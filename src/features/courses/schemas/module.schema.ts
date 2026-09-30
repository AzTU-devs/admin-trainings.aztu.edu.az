import { z } from "zod";

export const moduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(160),
  // Rich-text HTML, so the API's cap counts markup.
  description: z.string().max(10_000, "This description is too long").optional(),
});

export type ModuleFormValues = z.infer<typeof moduleSchema>;
