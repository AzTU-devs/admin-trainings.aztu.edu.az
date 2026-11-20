import { z } from "zod";
import type { UUID } from "@shared/types/lms";
import type { CreateCertificateRequest } from "@features/tutors/types";
import { ENTRY_LIMITS } from "@features/tutors/schemas/expertProfile.schema";

/** The API refuses a 31st certificate with 400 CERTIFICATE_LIMIT. */
export const CERTIFICATE_LIMIT = 30;

/**
 * Why an issue year is refused, or null (it is optional). The contract's year
 * floor, and nothing from the future: a certificate is issued before it is listed.
 */
export function issuedYearProblem(year: number | undefined): string | null {
  if (year === undefined) return null;
  const now = new Date().getFullYear();
  if (!Number.isInteger(year)) return "A whole year, such as 2021";
  if (year < ENTRY_LIMITS.earliestYear) return `${ENTRY_LIMITS.earliestYear} or later`;
  if (year > now) return `${now} at the latest`;
  return null;
}

/** The "Add certificate" dialog: the details and the PDF, which is uploaded on submit. */
export const certificateSchema = z
  .object({
    title: z.string(),
    issuer: z.string(),
    issuedYear: z.number().optional(),
    file: z.custom<File | undefined>(),
  })
  .superRefine((values, ctx) => {
    const title = values.title.trim();
    if (!title) ctx.addIssue({ code: "custom", path: ["title"], message: "Enter the certificate's title" });
    else if (title.length > ENTRY_LIMITS.nameLength) {
      ctx.addIssue({ code: "custom", path: ["title"], message: `At most ${ENTRY_LIMITS.nameLength} characters` });
    }
    if (values.issuer.trim().length > ENTRY_LIMITS.nameLength) {
      ctx.addIssue({ code: "custom", path: ["issuer"], message: `At most ${ENTRY_LIMITS.nameLength} characters` });
    }
    const year = issuedYearProblem(values.issuedYear);
    if (year) ctx.addIssue({ code: "custom", path: ["issuedYear"], message: year });
    if (!(values.file instanceof File)) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "Choose the certificate's PDF" });
    }
  });

export type CertificateFormValues = z.infer<typeof certificateSchema>;

export const EMPTY_CERTIFICATE: CertificateFormValues = { title: "", issuer: "", issuedYear: undefined, file: undefined };

/** The POST body: trimmed, with the optional fields left out when empty. */
export function toCreateCertificateRequest(values: CertificateFormValues, mediaId: UUID): CreateCertificateRequest {
  const issuer = values.issuer.trim();
  return {
    title: values.title.trim(),
    ...(issuer ? { issuer } : {}),
    ...(values.issuedYear !== undefined ? { issuedYear: values.issuedYear } : {}),
    mediaId,
  };
}
