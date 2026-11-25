import { describe, expect, it } from "vitest";
import { firstNameOf, isGoneRequest, priceText, seatsLeftText, studentName } from "./requests";
import { isEnrollmentRequest } from "@shared/types/lms";
import {
  applicantName,
  isStaleDecision,
  signUpMethodLabel,
} from "@features/account-approvals/lib/accounts";

describe("enrolment request helpers", () => {
  it("names the student, falling back to the e-mail", () => {
    expect(studentName({ firstName: "Leyla", lastName: "Əliyeva", email: "l@x.az" })).toBe(
      "Leyla Əliyeva",
    );
    expect(studentName({ firstName: "", lastName: "", email: "l@x.az" })).toBe("l@x.az");
    expect(firstNameOf({ firstName: "Leyla", lastName: "Əliyeva", email: "l@x.az" })).toBe("Leyla");
    expect(firstNameOf({ firstName: " ", lastName: "Əliyeva", email: "l@x.az" })).toBe("Əliyeva");
  });

  it("says how many seats are left, full, or no limit for an online course", () => {
    expect(seatsLeftText(3)).toBe("3 seats left");
    expect(seatsLeftText(1)).toBe("1 seat left");
    expect(seatsLeftText(0)).toBe("Full");
    expect(seatsLeftText(null)).toBe("No seat limit");
  });

  it("prices a request as free or with its currency", () => {
    expect(priceText({ paid: false, price: null, currency: null })).toBe("Free");
    expect(priceText({ paid: true, price: 50, currency: "AZN" })).toBe("50 AZN");
  });

  it("knows which refusals mean the request is no longer there to decide", () => {
    expect(isGoneRequest({ status: 409, code: "ENROLLMENT_NOT_PENDING" })).toBe(true);
    expect(isGoneRequest({ status: 409, code: "COURSE_ENDED" })).toBe(true);
    expect(isGoneRequest({ status: 404, code: "COURSE_NOT_FOUND" })).toBe(true);
    expect(isGoneRequest({ status: 409, code: "COURSE_FULL" })).toBe(false);
    expect(isGoneRequest({ status: 403, code: "FORBIDDEN" })).toBe(false);
  });

  it("tells a request from an enrolment", () => {
    expect(isEnrollmentRequest("PENDING_APPROVAL")).toBe(true);
    expect(isEnrollmentRequest("REJECTED")).toBe(true);
    for (const status of [
      "PENDING_PAYMENT",
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
      "REFUNDED",
      undefined,
    ]) {
      expect(isEnrollmentRequest(status)).toBe(false);
    }
  });
});

describe("account approval helpers", () => {
  it("labels the sign-up method as the profile page labels sign-in methods", () => {
    expect(signUpMethodLabel("PASSWORD")).toBe("Email & password");
    expect(signUpMethodLabel("GOOGLE")).toBe("Google");
    expect(signUpMethodLabel("APPLE")).toBe("Apple");
    expect(signUpMethodLabel("FACEBOOK")).toBe("Facebook");
  });

  it("names an applicant, or shows the e-mail of one who came without a name", () => {
    expect(applicantName({ firstName: "Kamran", lastName: "Quliyev", email: "k@x.az" })).toBe(
      "Kamran Quliyev",
    );
    expect(applicantName({ firstName: "", lastName: "", email: "k@x.az" })).toBe("k@x.az");
  });

  it("closes on a decision made elsewhere, not on any other refusal", () => {
    expect(isStaleDecision({ status: 409, code: "ACCOUNT_NOT_PENDING" })).toBe(true);
    expect(isStaleDecision({ status: 404, code: "USER_NOT_FOUND" })).toBe(true);
    expect(isStaleDecision({ status: 400, code: "VALIDATION_FAILED" })).toBe(false);
  });
});
