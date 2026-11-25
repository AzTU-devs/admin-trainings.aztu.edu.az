import { describe, expect, it } from "vitest";
import { env } from "@shared/config/env";
import {
  beforeLastDay,
  certificateCounts,
  certificatePageUrl,
  certificatePdfUrl,
  courseExperts,
  endedLine,
  formatBakuDate,
  formatBakuDay,
  formatCertificateCode,
  graduatable,
  graduateCountLabel,
  graduateName,
  hasCertificatesSection,
  isLive,
} from "./certificates";
import type { CertificateRef, CourseGraduationView, GraduationStudent } from "@features/certificates/types";

const cert = (revokedAt: string | null = null): CertificateRef => ({
  id: "c",
  code: "7K3M9QXR2D4T",
  issuedAt: "2026-11-24T08:00:00Z",
  revokedAt,
});

const student = (enrollmentId: string, certificate: CertificateRef | null): GraduationStudent => ({
  enrollmentId,
  studentId: `s-${enrollmentId}`,
  firstName: "Leyla",
  lastName: "Məmmədova",
  email: "leyla@example.com",
  enrollmentStatus: "ACTIVE",
  attendance: null,
  progressPercent: null,
  certificate,
});

describe("formatCertificateCode", () => {
  it("prints the bare code as AZTU-XXXX-XXXX-XXXX", () => {
    expect(formatCertificateCode("7K3M9QXR2D4T")).toBe("AZTU-7K3M-9QXR-2D4T");
  });

  it("accepts the printed form, any case, with or without the prefix and hyphens", () => {
    expect(formatCertificateCode("AZTU-7K3M-9QXR-2D4T")).toBe("AZTU-7K3M-9QXR-2D4T");
    expect(formatCertificateCode("aztu7k3m9qxr2d4t")).toBe("AZTU-7K3M-9QXR-2D4T");
    expect(formatCertificateCode("7k3m-9qxr-2d4t")).toBe("AZTU-7K3M-9QXR-2D4T");
  });

  it("leaves anything else as it came", () => {
    expect(formatCertificateCode("SHORT")).toBe("SHORT");
    expect(formatCertificateCode("")).toBe("");
  });
});

describe("certificate links", () => {
  it("point at the website's Azerbaijani certificate page and its PDF", () => {
    expect(certificatePageUrl("7K3M9QXR2D4T")).toBe(`${env.site.url}/az/certificates/7K3M9QXR2D4T`);
    expect(certificatePdfUrl("7K3M9QXR2D4T")).toBe(`${env.site.url}/az/certificates/7K3M9QXR2D4T/pdf`);
  });

  it("keep an odd code inside its path segment", () => {
    expect(certificatePageUrl("a/b?c")).toBe(`${env.site.url}/az/certificates/a%2Fb%3Fc`);
  });

  it("never end the site's origin in a slash", () => {
    expect(env.site.url).not.toMatch(/\/$/);
  });
});

describe("who can still be graduated", () => {
  const view = {
    students: [student("never", null), student("live", cert()), student("revoked", cert("2026-11-25T08:00:00Z"))],
  };

  it("is everyone without a live certificate, in order", () => {
    expect(graduatable(view).map((s) => s.enrollmentId)).toEqual(["never", "revoked"]);
    expect(isLive(cert())).toBe(true);
    expect(isLive(cert("2026-11-25T08:00:00Z"))).toBe(false);
    expect(isLive(null)).toBe(false);
  });

  it("counts valid and revoked certificates", () => {
    expect(certificateCounts(view)).toEqual({ valid: 1, revoked: 1 });
  });

  it("says how many of them graduate", () => {
    expect(graduateCountLabel(12, 14)).toBe("12 of 14 will graduate and receive a certificate");
    expect(graduateCountLabel(0, 14)).toBe("None of 14 selected: no one graduates now. They can be graduated later.");
  });

  it("has a Certificates section once ended, or while certificates exist", () => {
    expect(hasCertificatesSection(undefined)).toBe(false);
    const running = { endedAt: null, students: [student("never", null)] } as unknown as CourseGraduationView;
    expect(hasCertificatesSection(running)).toBe(false);
    expect(hasCertificatesSection({ ...running, endedAt: "2026-11-24T08:00:00Z" })).toBe(true);
    expect(hasCertificatesSection({ ...running, students: [student("live", cert())] })).toBe(true);
  });
});

describe("dates and names", () => {
  it("writes an instant as its Baku date, whatever the viewer's zone", () => {
    // 21:30 UTC is already the next day in Baku (UTC+4).
    expect(formatBakuDate("2026-11-24T21:30:00Z")).toBe("Wed 25 Nov 2026");
    expect(formatBakuDay("2026-11-24T21:30:00Z")).toBe("25 Nov 2026");
    expect(formatBakuDate("not a date")).toBe("");
    expect(formatBakuDay(null)).toBe("");
  });

  it("says when and by whom the course ended", () => {
    expect(endedLine({ endedAt: "2026-11-24T08:30:00Z", endedByName: "Aysel Quliyeva" })).toBe(
      "Ended on Tue 24 Nov 2026 by Aysel Quliyeva",
    );
    expect(endedLine({ endedAt: "2026-11-24T08:30:00Z", endedByName: null })).toBe("Ended on Tue 24 Nov 2026");
    expect(endedLine({ endedAt: null, endedByName: "Aysel Quliyeva" })).toBe("");
  });

  it("names a student by first and last name, else by email", () => {
    expect(graduateName({ firstName: "Leyla", lastName: "Məmmədova", email: "x@example.com" })).toBe("Leyla Məmmədova");
    expect(graduateName({ firstName: "", lastName: "", email: "x@example.com" })).toBe("x@example.com");
  });
});

describe("beforeLastDay", () => {
  it("holds for an in-person course before its end date (Baku)", () => {
    expect(beforeLastDay({ courseType: "OFFLINE", endDate: "2026-12-18" }, "2026-12-17")).toBe(true);
    expect(beforeLastDay({ courseType: "ONE_TIME", endDate: "2026-12-18" }, "2026-12-17")).toBe(true);
  });

  it("does not on or after the end date, for an online course, or without an end date", () => {
    expect(beforeLastDay({ courseType: "OFFLINE", endDate: "2026-12-18" }, "2026-12-18")).toBe(false);
    expect(beforeLastDay({ courseType: "OFFLINE", endDate: "2026-12-18" }, "2026-12-19")).toBe(false);
    expect(beforeLastDay({ courseType: "ONLINE", endDate: "2026-12-18" }, "2026-12-01")).toBe(false);
    expect(beforeLastDay({ courseType: "OFFLINE", endDate: null }, "2026-12-01")).toBe(false);
  });
});

describe("courseExperts", () => {
  it("lists the editor first, then the roster, each once", () => {
    expect(
      courseExperts({
        tutorId: "b",
        tutorDisplayName: "Editor B",
        tutors: [
          { tutorId: "a", displayName: "Expert A", authorized: false },
          { tutorId: "b", displayName: "Expert B", authorized: true },
          { tutorId: "c", displayName: null, authorized: false },
        ],
      }),
    ).toEqual([
      { tutorId: "b", displayName: "Expert B" },
      { tutorId: "a", displayName: "Expert A" },
      { tutorId: "c", displayName: "" },
    ]);
  });

  it("adds the editor from the course when the roster leaves them out", () => {
    expect(courseExperts({ tutorId: "e", tutorDisplayName: "Editor E", tutors: [] })).toEqual([
      { tutorId: "e", displayName: "Editor E" },
    ]);
  });
});
