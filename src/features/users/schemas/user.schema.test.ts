import { describe, expect, it } from "vitest";
import { newUserSchema, userSchema } from "./user.schema";

const base = { email: "a@example.com", fullName: "Ada Lovelace", phone: "", roles: ["USER", "TUTOR"] as const };

describe("user schemas", () => {
  // Regression: every edit failed — the hidden password was "" and min(8) refused it.
  it("accepts an edit with the blank hidden password", () => {
    expect(userSchema.safeParse({ ...base, password: "" }).success).toBe(true);
  });

  // Regression: the roles enum had no USER, which every participant and expert holds.
  it("accepts the USER role", () => {
    expect(userSchema.safeParse({ ...base, roles: ["USER"], password: "" }).success).toBe(true);
  });

  it("requires a policy-strength password on create", () => {
    expect(newUserSchema.safeParse({ ...base, password: "" }).success).toBe(false);
    expect(newUserSchema.safeParse({ ...base, password: "short1A" }).success).toBe(false);
    expect(newUserSchema.safeParse({ ...base, password: "longenough1" }).success).toBe(false);
    expect(newUserSchema.safeParse({ ...base, password: "Long-Enough-1" }).success).toBe(true);
  });

  it("rejects a phone the API would refuse", () => {
    expect(userSchema.safeParse({ ...base, password: "", phone: "abc" }).success).toBe(false);
    expect(userSchema.safeParse({ ...base, password: "", phone: "+994 50 123 45 67" }).success).toBe(true);
  });
});
