import { httpClient } from "@lib/axios/httpClient";
import type { UUID } from "@shared/types/lms";

/**
 * Opens a stored PDF (an expert's CV or certificate) in a new tab.
 *
 * The dashboard reads it from the authenticated `/media/{id}/content`, which
 * staff, the uploader and the expert may all use whatever the profile's
 * approval: the public route is a 404 until the profile is approved, and a
 * fresh upload is on no profile yet. That route needs the bearer token, which a
 * plain link never sends, so the bytes come through the API client and the tab
 * shows them from an object URL.
 *
 * The tab is opened inside the click, before the request, so a popup blocker
 * lets it through; if one stopped it anyway, the file is downloaded instead.
 * The blob is typed as a PDF whatever the response said, so the tab can only
 * ever render a document — never run a page under the dashboard's origin.
 *
 * A tab opened this way starts with a copy of this tab's session storage,
 * the access token included, and signing out here does not clear that copy:
 * the dashboard opened in that tab later would still be signed in. ("noopener"
 * avoids the copy, but then there is no tab to send the PDF to once it has
 * loaded.) So the copy is cleared before anything loads there, and the tab is
 * cut off from this one; if it can't be cleared, the tab is closed and the
 * file downloaded instead.
 *
 * Rejects with the API client's error (and closes the tab) when the file can't
 * be read.
 */
export async function openStoredDocument(mediaId: UUID, fileName = "document.pdf"): Promise<void> {
  let tab = window.open("", "_blank");
  if (tab) {
    try {
      // The new tab's own copy (it is still on this origin); this tab keeps its session.
      tab.sessionStorage.clear();
      tab.opener = null;
    } catch {
      tab.close();
      tab = null;
    }
  }
  if (tab) {
    try {
      tab.document.title = "Opening…";
      tab.document.body.textContent = "Opening the PDF…";
    } catch {
      // Only the placeholder text; the tab is still sent to the PDF below.
    }
  }

  try {
    // No timeout, as for every media read: a stored PDF can be up to 200 MB.
    const res = await httpClient.get<Blob>(`/media/${mediaId}/content`, { responseType: "blob", timeout: 0 });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    // The tab holds the document once it has loaded it; the URL is only the way in.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}
