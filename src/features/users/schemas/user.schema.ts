import { z } from "zod";
import { ROLES } from "@shared/constants/roles";

export const userSchema = z.object({
  email: z.string().email("Enter a valid email"),
  fullName: z.string().min(2, "Full name is required").max(120),
  phone: z.string().max(32).optional(),
  roles: z.array(z.enum([ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN])).min(1, "Assign at least one role"),
  password: z.string().min(8).max(128).optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;
