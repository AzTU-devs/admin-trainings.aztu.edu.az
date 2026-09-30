import { describe, expect, it } from "vitest";
import {
  DASH,
  detailEntries,
  displayUrl,
  formatDateTime,
  isLockedNow,
  orcidHref,
  safeExternalUrl,
} from "./format";
import { normalizeUserProfile } from "./normalize";
import type { UserProfileDto } from "@features/user-profile/types";

describe("safeExternalUrl", () => {
  it("keeps a plain http(s) address", () => {
    expect(safeExternalUrl(" https://www.linkedin.com/in/leyla ")).toBe("https://www.linkedin.com/in/leyla");
    expect(safeExternalUrl("http://example.az")).toBe("http://example.az/");
  });

  it("never lets a typed value become a script, a relative link or a disguised host", () => {
    for (const raw of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "linkedin.com/in/leyla",
      "//evil.example",
      "https://linkedin.com@evil.example/in/leyla",
      "https://exa mple.az",
      "",
      null,
      undefined,
    ]) {
      expect(safeExternalUrl(raw), String(raw)).toBeNull();
    }
  });

  it("shows a link without its scheme or www", () => {
    expect(displayUrl("https://www.linkedin.com/in/leyla/")).toBe("linkedin.com/in/leyla");
    expect(displayUrl("https://github.com/")).toBe("github.com");
  });
});

describe("orcidHref", () => {
  it("links a bare iD or an orcid.org address, nothing else", () => {
    expect(orcidHref("0000-0002-1825-009x")).toBe("https://orcid.org/0000-0002-1825-009X");
    expect(orcidHref("https://orcid.org/0000-0002-1825-0097")).toBe("https://orcid.org/0000-0002-1825-0097");
    expect(orcidHref("https://evil.example/0000-0002-1825-0097")).toBeNull();
    expect(orcidHref("not an id")).toBeNull();
  });
});

describe("detailEntries", () => {
  it("lists key: value pairs, leaving out empty values and showing nested ones as JSON", () => {
    expect(detailEntries({ reason: "BAD_PASSWORD", attempt: 2, note: null, geo: { cc: "AZ" } })).toEqual([
      ["reason", "BAD_PASSWORD"],
      ["attempt", "2"],
      ["geo", '{"cc":"AZ"}'],
    ]);
    expect(detailEntries(null)).toEqual([]);
  });
});

describe("dates", () => {
  it("writes a dash for a missing or unreadable instant", () => {
    expect(formatDateTime(null)).toBe(DASH);
    expect(formatDateTime("not a date")).toBe(DASH);
  });

  it("treats a lockout as current only while it is ahead", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(isLockedNow("2026-09-30T12:15:00Z", now)).toBe(true);
    expect(isLockedNow("2026-09-30T11:45:00Z", now)).toBe(false);
    expect(isLockedNow(null, now)).toBe(false);
  });
});

describe("normalizeUserProfile", () => {
  it("fills in lists an API build left out (customExpertise came late)", () => {
    const raw = {
      account: { id: "u", email: "a@b.az", roles: ["USER", "TUTOR"] },
      expert: { id: "t", expertise: [{ id: "c", name: "IT" }], stats: undefined },
      learner: { orders: [{ id: "o" }] },
      activity: {},
    } as unknown as UserProfileDto;

    const profile = normalizeUserProfile(raw);
    expect(profile.account.identities).toEqual([]);
    expect(profile.expert?.customExpertise).toEqual([]);
    expect(profile.expert?.expertise).toEqual([{ id: "c", name: "IT" }]);
    expect(profile.expert?.courses).toEqual([]);
    expect(profile.expert?.stats.courseCount).toBe(0);
    expect(profile.learner.orders[0].items).toEqual([]);
    expect(profile.learner.orders[0].payments).toEqual([]);
    expect(profile.learner.enrollments).toEqual([]);
    expect(profile.activity.sessions).toEqual([]);
  });

  it("keeps a null expert null", () => {
    const raw = {
      account: { id: "u", email: "a@b.az", roles: ["USER"], identities: [] },
      expert: null,
      learner: { enrollments: [], orders: [], reviews: [], stats: { enrollmentCount: 0, activeCount: 0, completedCount: 0, averageProgress: 0 } },
      activity: { sessions: [], securityEvents: [], auditTrail: [] },
    } as unknown as UserProfileDto;
    expect(normalizeUserProfile(raw).expert).toBeNull();
  });
});
