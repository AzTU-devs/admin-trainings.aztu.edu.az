import { describe, expect, it } from "vitest";
import { ENUM_LABELS, enumLabel, humanizeCode, type EnumFamily } from "./enumLabels";

describe("enumLabel", () => {
  it("names the codes the regression pass found printed raw", () => {
    expect(enumLabel("userStatus", "DISABLED")).toBe("Disabled");
    expect(enumLabel("userStatus", "ACTIVE")).toBe("Active");
    expect(enumLabel("enrollmentStatus", "CANCELLED")).toBe("Cancelled");
    expect(enumLabel("enrollmentSource", "ADMIN_GRANT")).toBe("Added by an admin");
    expect(enumLabel("notificationChannel", "IN_APP")).toBe("In-app");
    expect(enumLabel("notificationStatus", "SENT")).toBe("Sent");
    expect(enumLabel("videoStatus", "UPLOADING")).toBe("Uploading");
    expect(enumLabel("severity", "HIGH")).toBe("High");
    expect(enumLabel("securityEventKind", "FAILED_LOGIN")).toBe("Failed sign-in");
  });

  it("reads the same status the same way on every screen", () => {
    // The profile gets SUSPENDED from /auth/me where the user list says DISABLED.
    expect(enumLabel("userStatus", "SUSPENDED")).toBe(enumLabel("userStatus", "DISABLED"));
  });

  it("humanizes a code the map does not know instead of printing it raw", () => {
    expect(enumLabel("securityEventKind", "NEW_KIND_FROM_API")).toBe("New kind from api");
    expect(humanizeCode("READY")).toBe("Ready");
  });

  it("does not treat object built-ins as labels", () => {
    expect(enumLabel("role", "constructor")).toBe("Constructor");
    expect(enumLabel("role", "toString")).toBe("Tostring");
  });

  it("gives every code a label that is not the code itself (acronyms aside)", () => {
    const acronyms = new Set(["PDF", "SMS"]);
    for (const family of Object.keys(ENUM_LABELS) as EnumFamily[]) {
      for (const [code, label] of Object.entries(ENUM_LABELS[family])) {
        if (acronyms.has(code)) continue;
        expect(label, `${family}.${code}`).not.toBe(code);
        expect(label, `${family}.${code}`).not.toMatch(/_/);
      }
    }
  });
});
