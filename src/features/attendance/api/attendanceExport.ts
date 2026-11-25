import { httpClient } from "@lib/axios/httpClient";
import { attachmentFileName, saveBlob } from "@shared/lib/download";
import type { UUID } from "@shared/types/lms";

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A big course's register is written on the server first; the client's 30 s default is for JSON. */
const EXPORT_TIMEOUT_MS = 120_000;

/**
 * Backend `GET /api/portal/courses/{courseId}/attendance/export` — the
 * register as an `.xlsx`, saved under the name the server gives it
 * (`attendance-<slug>-<yyyy-MM-dd>.xlsx`), or `fallbackName` when the header
 * is not readable here. Read through the API client, not a link: the route
 * needs the bearer token. Not an RTK Query endpoint: a file is not state to
 * cache, and a Blob does not belong in the store.
 *
 * Resolves with the name the file was saved as; rejects with the API client's
 * error (the API's own message, see httpClient).
 */
export async function downloadAttendanceExport(courseId: UUID, fallbackName: string): Promise<string> {
  const res = await httpClient.request<Blob>({
    url: `/portal/courses/${courseId}/attendance/export`,
    method: "GET",
    responseType: "blob",
    timeout: EXPORT_TIMEOUT_MS,
    // JSON as well: a refusal comes back as the API's error body.
    headers: { Accept: `${XLSX_TYPE}, application/json;q=0.9` },
  });
  const fileName = attachmentFileName(res.headers?.["content-disposition"]) ?? fallbackName;
  // Typed as a workbook whatever the response said: it is only ever saved, never shown.
  saveBlob(new Blob([res.data], { type: XLSX_TYPE }), fileName);
  return fileName;
}
