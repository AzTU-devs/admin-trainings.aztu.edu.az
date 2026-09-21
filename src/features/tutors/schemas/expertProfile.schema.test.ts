import { describe, expect, it } from "vitest";
import {
  expertProfileSchema,
  normalizeOrcid,
  toFormValues,
  toUpdateRequest,
} from "./expertProfile.schema";
import type { TutorProfileDto } from "@features/tutors/types";

const CATEGORY_A = "6f1c1c1e-3a52-4c1e-9d59-0d9f3f6f4a01";
const CATEGORY_B = "6f1c1c1e-3a52-4c1e-9d59-0d9f3f6f4a02";

function savedProfile(overrides: Partial<TutorProfileDto> = {}): TutorProfileDto {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    userId: "a0000000-0000-4000-8000-000000000002",
    firstName: "Leyla",
    lastName: "Məmmədova",
    headline: "Lecturer",
    websiteUrl: "https://example.az",
    approvalStatus: "APPROVED",
    ratingCount: 0,
    expertiseCategoryIds: [CATEGORY_A],
    ...overrides,
  };
}

function parse(overrides: Partial<ReturnType<typeof toFormValues>>) {
  return expertProfileSchema.safeParse({ ...toFormValues(savedProfile()), ...overrides });
}

describe("toUpdateRequest", () => {
  it("sends nothing when nothing changed, including fields the API returned as null", () => {
    // The API serialises unset fields as null; the form holds them as "".
    const saved = savedProfile({ bio: null as unknown as string, orcid: null as unknown as string });
    expect(toUpdateRequest(toFormValues(saved), saved)).toEqual({});
  });

  it("sends only the fields that changed, trimmed", () => {
    const saved = savedProfile();
    const values = { ...toFormValues(saved), academicTitle: "  Dosent ", headline: "Lecturer " };
    expect(toUpdateRequest(values, saved)).toEqual({ academicTitle: "Dosent" });
  });

  it("clears a text field by sending an empty string, since an absent key means 'leave it'", () => {
    const saved = savedProfile();
    expect(toUpdateRequest({ ...toFormValues(saved), websiteUrl: "  " }, saved)).toEqual({
      websiteUrl: "",
    });
  });

  it("keeps one entry per line and drops blank lines in education and certifications", () => {
    const saved = savedProfile({ education: "PhD, AzTU" });
    const values = { ...toFormValues(saved), education: "PhD, AzTU\n\n  MSc, ADA  \n" };
    expect(toUpdateRequest(values, saved)).toEqual({ education: "PhD, AzTU\nMSc, ADA" });
  });

  it("stores an ORCID pasted as a link in its bare form", () => {
    const saved = savedProfile();
    const values = { ...toFormValues(saved), orcid: "https://orcid.org/0000-0002-1694-233x" };
    expect(toUpdateRequest(values, saved)).toEqual({ orcid: "0000-0002-1694-233X" });
  });

  it("treats the same categories in another order as unchanged", () => {
    const saved = savedProfile({ expertiseCategoryIds: [CATEGORY_A, CATEGORY_B] });
    const values = { ...toFormValues(saved), expertiseCategoryIds: [CATEGORY_B, CATEGORY_A] };
    expect(toUpdateRequest(values, saved)).toEqual({});
  });

  it("sends a replaced photo's id, and null to remove the photo", () => {
    const saved = savedProfile({ avatarMediaId: "b0000000-0000-4000-8000-000000000001" });
    const replaced = { ...toFormValues(saved), avatarMediaId: "b0000000-0000-4000-8000-000000000002" };
    expect(toUpdateRequest(replaced, saved)).toEqual({ avatarMediaId: replaced.avatarMediaId });
    // Leaving the key out would mean "keep it"; only an explicit null clears it.
    const removed = { ...toFormValues(saved), avatarMediaId: undefined };
    expect(toUpdateRequest(removed, saved)).toEqual({ avatarMediaId: null });
  });

  it("clears the years of experience with null and leaves an unset one alone", () => {
    const withYears = savedProfile({ yearsExperience: 12 });
    const blanked = { ...toFormValues(withYears), yearsExperience: undefined };
    expect(toUpdateRequest(blanked, withYears)).toEqual({ yearsExperience: null });

    const without = savedProfile({ yearsExperience: null as unknown as number });
    expect(toUpdateRequest(toFormValues(without), without)).toEqual({});
  });

  it("never carries the approval status, which only the decision endpoint may change", () => {
    const saved = savedProfile({ approvalStatus: "PENDING" });
    const body = toUpdateRequest({ ...toFormValues(saved), headline: "New" }, saved);
    expect(body).not.toHaveProperty("approvalStatus");
  });
});

describe("expertProfileSchema", () => {
  it("accepts blank links and a full https address", () => {
    expect(parse({ linkedinUrl: "", githubUrl: "https://github.com/leyla" }).success).toBe(true);
  });

  it("refuses anything but a plain http(s) address with a real host", () => {
    const refused = [
      "github.com/leyla",
      "https:github.com",
      "ftp://files.example.az",
      "https://localhost",
      // Reads as LinkedIn, goes to evil.example — the API refuses credentials too.
      "https://linkedin.com@evil.example/in/leyla",
    ];
    for (const url of refused) {
      expect(parse({ githubUrl: url }).success, url).toBe(false);
    }
  });

  it("refuses an ORCID of the wrong shape or with a failing check digit", () => {
    expect(parse({ orcid: "0000-0002-1825-0097" }).success).toBe(true);
    expect(parse({ orcid: "0000-0002-1825-009" }).success).toBe(false);
    expect(parse({ orcid: "0000-0002-1825-0098" }).success).toBe(false);
  });

  it("requires at least one area of expertise, as the application did", () => {
    expect(parse({ expertiseCategoryIds: [] }).success).toBe(false);
  });
});

describe("normalizeOrcid", () => {
  it("strips an orcid.org link and upper-cases the X check digit", () => {
    expect(normalizeOrcid(" https://www.orcid.org/0000-0002-1694-233x ")).toBe("0000-0002-1694-233X");
  });
});
