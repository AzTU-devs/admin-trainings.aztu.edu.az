import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { apiErrorMessage, applyFieldErrors, humanizeField } from "./apiError";

const err = (over: object) => ({ status: 400, message: "", isNormalized: true as const, ...over });

describe("apiErrorMessage", () => {
  it("prefers the server's message over the fallback", () => {
    expect(apiErrorMessage(err({ message: "Category slug 'x' is taken" }), "Save failed")).toBe("Category slug 'x' is taken");
  });

  it("replaces a bare 'Request validation failed' with the first field's reason", () => {
    expect(
      apiErrorMessage(err({ code: "VALIDATION_FAILED", message: "Request validation failed", fieldErrors: { "offlineDetails.startDate": "must be a future date" } }), "x"),
    ).toBe("Start date: must be a future date");
  });

  it("falls back when there is nothing to say", () => {
    expect(apiErrorMessage(err({}), "Save failed")).toBe("Save failed");
  });

  it("humanizes field paths", () => {
    expect(humanizeField("course.learningOutcomes")).toBe("Learning outcomes");
  });
});

describe("applyFieldErrors", () => {
  it("marks known fields and skips ones the form does not have", () => {
    const { result } = renderHook(() => useForm({ defaultValues: { title: "", details: { city: "" } } }));
    applyFieldErrors(result.current, { title: "must not be blank", "details.city": "too long", "0": "junk" });
    expect(result.current.getFieldState("title").error?.message).toBe("must not be blank");
    expect(result.current.getFieldState("details.city").error?.message).toBe("too long");
  });
});
