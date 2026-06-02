import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: z
    .string()
    .min(2, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens"),
  description: z.string().max(2000).optional(),
  iconUrl: z.string().max(255).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0),
  active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
