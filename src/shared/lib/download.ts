/*
 * Saving a file the API generated (an Excel export, say) on the user's
 * machine. The bytes come through the API client — the routes need the bearer
 * token, which a plain link never sends — so the browser is handed them as an
 * object URL behind a download link.
 */

/** Characters no file system takes in a name, control characters included. */
// eslint-disable-next-line no-control-regex
const UNSAFE_IN_NAME = /[\u0000-\u001f\u007f/\\:*?"<>|]+/g;

/**
 * The file name a `Content-Disposition: attachment; filename=…` header gives:
 * the RFC 5987 `filename*=UTF-8''…` form when it is there (it carries
 * non-ASCII names), else the plain `filename`. Path separators and the like
 * are dropped, so a name can never point outside the downloads folder. Null
 * when the header is missing (a proxy, or a CORS setup that does not expose
 * it) or names nothing.
 */
export function attachmentFileName(header: unknown): string | null {
  if (typeof header !== "string" || !header) return null;
  let name: string | null = null;
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (extended) {
    const value = extended[1].trim().replace(/^"(.*)"$/, "$1");
    const encoded = value.replace(/^[\w-]+'[^']*'/, "");
    try {
      name = decodeURIComponent(encoded);
    } catch {
      name = null;
    }
  }
  if (!name) {
    const plain = /filename\s*=\s*("((?:\\.|[^"\\])*)"|[^;]+)/i.exec(header);
    if (plain) name = plain[2] !== undefined ? plain[2].replace(/\\(.)/g, "$1") : plain[1].trim();
  }
  const safe = name?.replace(UNSAFE_IN_NAME, "_").replace(/^\.+/, "").trim();
  return safe || null;
}

/**
 * Saves `blob` as a file named `fileName`. The object URL is revoked a moment
 * later, once the browser has started the download from it.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
