import { z } from "zod";
import { ROLES } from "@shared/constants/roles";
import { PARTICIPANT_ROLE } from "@features/users/lib/roles";

export const userSchema = z.object({
  email: z.string().email("Enter a valid email"),
  fullName: z.string().min(2, "Full name is required").max(120),
  phone: z.string().max(32).optional(),
  // USER is accepted so a participant's own role survives an edit (the dialog
  // shows it only to an account that already holds it); it is never offered
  // for a new account.
  roles: z
    .array(z.enum([PARTICIPANT_ROLE, ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]))
    .min(1, "Assign at least one role"),
  password: z.string().min(8).max(128).optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;
