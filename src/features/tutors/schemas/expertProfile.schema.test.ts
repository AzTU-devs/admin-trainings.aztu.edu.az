import { describe, expect, it } from "vitest";
import {
  AREAS_REQUIRED_MESSAGE,
  expertProfileSchema,
  normalizeOrcid,
  normalizeOwnArea,
  ownAreaProblem,
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

  it("reads a profile without own areas (an API build that predates them) as none, and sends nothing for it", () => {
    const saved = savedProfile(); // no customExpertise key at all
    expect(toFormValues(saved).customExpertise).toEqual([]);
    expect(toUpdateRequest(toFormValues(saved), saved)).toEqual({});
  });

  it("sends the whole list of own areas, normalised, when one is added", () => {
    const saved = savedProfile({ customExpertise: ["Robotics"] });
    const values = { ...toFormValues(saved), customExpertise: ["Robotics", "  Computer   vision "] };
    expect(toUpdateRequest(values, saved)).toEqual({ customExpertise: ["Robotics", "Computer vision"] });
  });

  it("clears the own areas with an empty list, since an absent key means 'leave them'", () => {
    const saved = savedProfile({ customExpertise: ["Robotics"] });
    expect(toUpdateRequest({ ...toFormValues(saved), customExpertise: [] }, saved)).toEqual({ customExpertise: [] });
  });

  it("sends an empty category list when the own areas carry the profile", () => {
    const saved = savedProfile({ customExpertise: ["Robotics"] });
    const values = { ...toFormValues(saved), expertiseCategoryIds: [] };
    expect(toUpdateRequest(values, saved)).toEqual({ expertiseCategoryIds: [] });
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

  it("requires at least one area in total, reported under the category picker", () => {
    const result = parse({ expertiseCategoryIds: [], customExpertise: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["expertiseCategoryIds"], message: AREAS_REQUIRED_MESSAGE }),
    ]);
  });

  it("accepts own areas in place of categories, and categories alone", () => {
    expect(parse({ expertiseCategoryIds: [], customExpertise: ["Computer vision"] }).success).toBe(true);
    expect(parse({ expertiseCategoryIds: [CATEGORY_A], customExpertise: [] }).success).toBe(true);
  });

  it("still asks for an area while another field is wrong, so the message is never hidden", () => {
    const result = parse({ expertiseCategoryIds: [], customExpertise: [], githubUrl: "github.com/leyla" });
    const paths = result.error?.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["githubUrl", "expertiseCategoryIds"]));
  });

  it("holds own areas to the API's limits", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Area ${i + 1}`);
    expect(parse({ customExpertise: eleven }).success).toBe(false);
    expect(parse({ customExpertise: ["C"] }).success).toBe(false);
    expect(parse({ customExpertise: ["x".repeat(61)] }).success).toBe(false);
    expect(parse({ customExpertise: ["<b>AI</b>"] }).success).toBe(false);
    expect(parse({ customExpertise: ["Robotics", "robotics"] }).success).toBe(false);
    expect(parse({ customExpertise: ["x".repeat(60), "AI"] }).success).toBe(true);
  });
});

describe("ownAreaProblem", () => {
  it("accepts a new area and measures it after collapsing whitespace", () => {
    expect(ownAreaProblem("  Computer \t vision ", [])).toBeNull();
    expect(normalizeOwnArea("  Computer \t vision ")).toBe("Computer vision");
    // Two letters once trimmed.
    expect(ownAreaProblem("   AI   ", [])).toBeNull();
    expect(ownAreaProblem(" A ", [])).toBe("At least 2 characters");
  });

  it("refuses blanks, markup and control characters", () => {
    expect(ownAreaProblem("   ", [])).toBe("Type an area first");
    expect(ownAreaProblem("a < b", [])).toMatch(/Plain text only/);
    expect(ownAreaProblem("Robotics\u0007", [])).toMatch(/Plain text only/);
  });

  it("refuses a duplicate, ignoring case, and the name of a category already picked", () => {
    expect(ownAreaProblem("ROBOTICS", ["Robotics"])).toBe("Already added");
    expect(ownAreaProblem("information  technology", [], ["Information Technology"])).toBe(
      "Already picked from the list above",
    );
  });

  it("stops at ten", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `Area ${i + 1}`);
    expect(ownAreaProblem("One more", ten)).toBe("At most 10 areas of your own");
  });
});

describe("normalizeOrcid", () => {
  it("strips an orcid.org link and upper-cases the X check digit", () => {
    expect(normalizeOrcid(" https://www.orcid.org/0000-0002-1694-233x ")).toBe("0000-0002-1694-233X");
  });
});

const YEAR = new Date().getFullYear();

describe("toUpdateRequest — CV", () => {
  it("sends a new CV's id, null to remove it, and nothing when it is unchanged", () => {
    const saved = savedProfile({ cvMediaId: "c0000000-0000-4000-8000-000000000001" });
    const replaced = { ...toFormValues(saved), cvMediaId: "c0000000-0000-4000-8000-000000000002" };
    expect(toUpdateRequest(replaced, saved)).toEqual({ cvMediaId: replaced.cvMediaId });
    // Leaving the key out would mean "keep it"; only an explicit null removes it.
    expect(toUpdateRequest({ ...toFormValues(saved), cvMediaId: undefined }, saved)).toEqual({ cvMediaId: null });
    expect(toUpdateRequest(toFormValues(saved), saved)).toEqual({});
  });

  it("leaves a profile without a CV alone, whether the API sent null or nothing", () => {
    const nulled = savedProfile({ cvMediaId: null, cvUrl: null });
    expect(toUpdateRequest(toFormValues(nulled), nulled)).toEqual({});
    const absent = savedProfile();
    expect(toUpdateRequest(toFormValues(absent), absent)).toEqual({});
  });
});

describe("toUpdateRequest — education and experience", () => {
  const education = { institution: "AzTU", degree: null, startYear: 2010, endYear: 2014 };
  const job = { company: "Azercell", position: "Engineer", startYear: 2015, endYear: null, description: null };

  it("reads a profile from before the lists as none, and sends nothing for it", () => {
    const saved = savedProfile();
    expect(toFormValues(saved).educationEntries).toEqual([]);
    expect(toFormValues(saved).experienceEntries).toEqual([]);
    expect(toUpdateRequest(toFormValues(saved), saved)).toEqual({});
  });

  it("sends nothing when the saved lists are unchanged, nulls and all", () => {
    const saved = savedProfile({ educationEntries: [education], experienceEntries: [job] });
    expect(toUpdateRequest(toFormValues(saved), saved)).toEqual({});
  });

  it("sends the whole list in order, trimmed, blank optional texts as null and Present as null", () => {
    const saved = savedProfile({ educationEntries: [education] });
    const values = {
      ...toFormValues(saved),
      educationEntries: [
        ...toFormValues(saved).educationEntries,
        { institution: "  ADA University ", degree: "  ", startYear: "2022", endYear: null },
      ],
    };
    expect(toUpdateRequest(values, saved)).toEqual({
      educationEntries: [education, { institution: "ADA University", degree: null, startYear: 2022, endYear: null }],
    });
  });

  it("keeps a description's text and drops an empty one to null", () => {
    const saved = savedProfile({ experienceEntries: [job] });
    const values = {
      ...toFormValues(saved),
      experienceEntries: [{ ...toFormValues(saved).experienceEntries[0], description: "  Led the data team. " }],
    };
    expect(toUpdateRequest(values, saved)).toEqual({ experienceEntries: [{ ...job, description: "Led the data team." }] });
  });

  it("clears a list with [] — an absent key would leave it as it is", () => {
    const saved = savedProfile({ experienceEntries: [job] });
    expect(toUpdateRequest({ ...toFormValues(saved), experienceEntries: [] }, saved)).toEqual({ experienceEntries: [] });
  });

  it("treats the same entries in another order as a change: the order is what the page shows", () => {
    const second = { ...education, institution: "ADA University" };
    const saved = savedProfile({ educationEntries: [education, second] });
    const values = { ...toFormValues(saved), educationEntries: [...toFormValues(saved).educationEntries].reverse() };
    expect(toUpdateRequest(values, saved)).toEqual({ educationEntries: [second, education] });
  });
});

describe("expertProfileSchema — education and experience", () => {
  // Years as the form holds them: the text typed, "" while empty, null for Present.
  const edu = (over: Partial<ReturnType<typeof toFormValues>["educationEntries"][number]> = {}) => ({
    institution: "AzTU",
    degree: "",
    startYear: "2010",
    endYear: "2014" as string | null,
    ...over,
  });
  const job = (over: Partial<ReturnType<typeof toFormValues>["experienceEntries"][number]> = {}) => ({
    company: "Azercell",
    position: "Engineer",
    startYear: "2015",
    endYear: null as string | null,
    description: "",
    ...over,
  });
  const messages = (over: Partial<ReturnType<typeof toFormValues>>) =>
    (parse(over).error?.issues ?? []).map((i) => [i.path.join("."), i.message]);

  it("accepts a finished entry, one still under way (Present), and an expected graduation", () => {
    expect(parse({ educationEntries: [edu(), edu({ endYear: null }), edu({ endYear: String(YEAR + 10) })] }).success).toBe(true);
    expect(parse({ experienceEntries: [job(), job({ endYear: String(YEAR) })] }).success).toBe(true);
  });

  it("asks for the required texts and the years, each on its own field", () => {
    expect(messages({ educationEntries: [edu({ institution: "  ", startYear: "", endYear: "" })] })).toEqual([
      ["educationEntries.0.institution", "Enter the institution"],
      ["educationEntries.0.startYear", "Enter the start year"],
      ["educationEntries.0.endYear", "Enter the end year, or tick Present"],
    ]);
    expect(messages({ experienceEntries: [job({ company: "", position: " " })] })).toEqual([
      ["experienceEntries.0.company", "Enter the company or organisation"],
      ["experienceEntries.0.position", "Enter the position"],
    ]);
  });

  it("holds the years to the API's range", () => {
    expect(messages({ educationEntries: [edu({ startYear: "1949" })] })).toEqual([
      ["educationEntries.0.startYear", "1950 or later"],
    ]);
    expect(messages({ educationEntries: [edu({ startYear: String(YEAR + 1), endYear: null })] })).toEqual([
      ["educationEntries.0.startYear", `${YEAR} at the latest`],
    ]);
    expect(messages({ educationEntries: [edu({ startYear: "2015", endYear: "2012" })] })).toEqual([
      ["educationEntries.0.endYear", "Can't be before the start year"],
    ]);
    // Education may end ten years ahead (an expected graduation); a job not even one.
    expect(messages({ educationEntries: [edu({ endYear: String(YEAR + 11) })] })).toEqual([
      ["educationEntries.0.endYear", `${YEAR + 10} at the latest`],
    ]);
    expect(messages({ experienceEntries: [job({ endYear: String(YEAR + 1) })] })).toEqual([
      ["experienceEntries.0.endYear", `${YEAR} at the latest — tick Present for a role held now`],
    ]);
  });

  it("caps the texts, and each list at twenty entries", () => {
    expect(messages({ educationEntries: [edu({ institution: "x".repeat(201) })] })).toEqual([
      ["educationEntries.0.institution", "At most 200 characters"],
    ]);
    expect(messages({ experienceEntries: [job({ description: "x".repeat(1_001) })] })).toEqual([
      ["experienceEntries.0.description", "At most 1,000 characters"],
    ]);
    expect(parse({ educationEntries: Array.from({ length: 20 }, () => edu()) }).success).toBe(true);
    expect(parse({ educationEntries: Array.from({ length: 21 }, () => edu()) }).success).toBe(false);
  });
});
