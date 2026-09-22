import { z } from "zod";
import { ROLES } from "@shared/constants/roles";

/**
 * The self-registration password policy (RegisterRequest on the API). The admin
 * create endpoint does not enforce one itself, so it is applied here: a temporary
 * password handed to a new user should be no weaker than one they could choose.
 */
export const passwordPolicy = z
  .string()
  .min(10, "At least 10 characters")
  .max(100, "At most 100 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a digit");

/** Editing an existing account. */
export const userSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  // The API's own rule (ValidationPatterns.PHONE_OR_BLANK); blank clears it.
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9 ()-]{7,20}$/, "A phone number of 7-20 digits, spaces, dashes or brackets")
    .optional(),
  // USER is the participant role, which the API returns for learners and for
  // approved experts ([USER, TUTOR]). Without it every such account failed this
  // enum and could not be saved.
  roles: z
    .array(z.enum([ROLES.USER, ROLES.TUTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]))
    .min(1, "Assign at least one role"),
  // Blank while editing: the field is hidden there and the API ignores a blank
  // password. `min(8)` alone rejected "", which failed every edit with an error
  // no one could see.
  password: z.union([z.literal(""), passwordPolicy]).optional(),
});

/**
 * Creating an account. The password is required: an account created without one
 * can never sign in (PASSWORD_LOGIN_DISABLED) and cannot reset one either, and
 * the API sends no invitation — the dialog used to promise a magic link.
 */
export const newUserSchema = userSchema.extend({ password: passwordPolicy });

export type UserFormValues = z.infer<typeof userSchema>;
