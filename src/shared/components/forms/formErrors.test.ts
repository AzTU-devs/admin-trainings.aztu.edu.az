import { describe, expect, it } from "vitest";
import type { FieldErrors } from "react-hook-form";
import { flattenFieldErrors } from "./formErrors";

describe("flattenFieldErrors", () => {
  it("reaches nested objects and array elements", () => {
    const errors = {
      title: { type: "too_small", message: "Title is required", ref: {} },
      offlineDetails: { weeklyHours: { type: "invalid_type", message: "expected number, received null" } },
      roles: [{ type: "invalid_value", message: "Invalid option" }],
    };
    expect(flattenFieldErrors(errors as unknown as FieldErrors)).toEqual([
      { path: "title", message: "Title is required" },
      { path: "offlineDetails.weeklyHours", message: "expected number, received null" },
      { path: "roles.0", message: "Invalid option" },
    ]);
  });
});
