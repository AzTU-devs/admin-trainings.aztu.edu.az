import { describe, expect, it } from "vitest";
import { formatEnum, statusTone } from "./enums";

describe("formatEnum", () => {
  it("sentence-cases upper-case enum values, same words", () => {
    expect(formatEnum("ACTIVE")).toBe("Active");
    expect(formatEnum("SUPER_ADMIN")).toBe("Super admin");
    expect(formatEnum("ADMIN_GRANT")).toBe("Admin grant");
    expect(formatEnum("IN_APP")).toBe("In app");
  });

  it("keeps acronyms upper-case", () => {
    expect(formatEnum("SMS")).toBe("SMS");
    expect(formatEnum("IP_BLOCKED")).toBe("IP blocked");
    expect(formatEnum("LOGIN_FAILED_API")).toBe("Login failed API");
  });

  it("leaves text that is not an enum alone", () => {
    expect(formatEnum("Published")).toBe("Published");
    expect(formatEnum("In review")).toBe("In review");
    expect(formatEnum("")).toBe("");
    expect(formatEnum(null)).toBe("");
  });
});

describe("statusTone", () => {
  it("gives a value the same tone everywhere", () => {
    expect(statusTone("ACTIVE")).toBe("success");
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("HIGH")).toBe("danger");
  });

  it("falls back to neutral for sources, channels and unknown values", () => {
    expect(statusTone("FREE")).toBe("neutral");
    expect(statusTone("IN_APP")).toBe("neutral");
    expect(statusTone("SOMETHING_NEW")).toBe("neutral");
    expect(statusTone(undefined, "brand")).toBe("brand");
  });
});
