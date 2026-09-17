import type { Accept } from "react-dropzone";

/**
 * The client half of the backend's upload allowlist (`AllowedMediaType` in the
 * API repo).
 *
 * Keeping the two lists in step is what makes a rejection instant and legible:
 * the server still re-checks each file's real leading bytes, so anything that
 * slips past here is refused there anyway — just minutes later and with a
 * stranger message. If the backend allowlist changes, change this with it.
 *
 * Note what is absent on purpose. `image/svg+xml` is not an image as far as this
 * app is concerned: it is an XML document that can carry `<script>`, and stored
 * media is served from `/api/media/{id}/content`, which nginx proxies under the
 * portal's own origin. The API refuses it; a dropzone advertising `image/*` only
 * teaches people to try. The same goes for HTML, XML and anything executable.
 */

/** Exactly the `UploadKind.IMAGE` types the API accepts. */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
] as const;

/** Exactly the `UploadKind.VIDEO` types the API accepts. */
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

/** Exactly the `UploadKind.DOCUMENT` types the API accepts — PDF and nothing else. */
export const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

/** Extensions the API stores each accepted type under, for the file-picker filter. */
export const IMAGE_ACCEPT: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
};

export const VIDEO_ACCEPT: Accept = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

export const DOCUMENT_ACCEPT: Accept = {
  "application/pdf": [".pdf"],
};

/**
 * Every type the API will store, for pickers that are not tied to one kind — a
 * lesson attachment on a TEXT or QUIZ lesson, say.
 *
 * "Any supporting file" is the one place this used to be expressed as no filter at
 * all, which offered the picker a `.js`, `.html` or `.svg` that the API then
 * refused after the upload. An unfiltered picker is not more permissive here, only
 * later and less clearly.
 */
export const ANY_MEDIA_ACCEPT: Accept = {
  ...IMAGE_ACCEPT,
  ...VIDEO_ACCEPT,
  ...DOCUMENT_ACCEPT,
};

/** Human wording for each allowlist — used in help text and rejection messages. */
export const IMAGE_FORMATS_LABEL = "JPEG, PNG, GIF, WebP or AVIF";
export const VIDEO_FORMATS_LABEL = "MP4, WebM or MOV";
export const DOCUMENT_FORMATS_LABEL = "PDF";
export const ANY_MEDIA_FORMATS_LABEL = "an image, a video or a PDF";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const DOCUMENT_EXTENSIONS = [".pdf"];

/**
 * What a browser reports for a file whose type it cannot name. The API treats it
 * as "no claim made" and lets its own signature detection decide, so sending it
 * is strictly better than guessing `video/mp4`: a mislabelled MOV would come
 * back as MEDIA_TYPE_MISMATCH.
 */
const UNKNOWN_MIME = "application/octet-stream";

/**
 * The `Content-Type` to PUT the bytes under. A type the API does not accept is
 * never forwarded as a claim — detection on the server settles it either way.
 */
export function videoContentType(file: File): string {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(file.type) ? file.type : UNKNOWN_MIME;
}

/**
 * Size and type check run before a single byte leaves the browser. Returns the
 * message to show, or null when the file is acceptable.
 *
 * Both halves matter: without the size check a 600 MB pick uploads for minutes
 * and dies on nginx's `client_max_body_size` as a bodyless 413; without the type
 * check an AVI is refused only once the API has sniffed its header.
 */
export function validateVideoFile(file: File, maxSizeMb: number): string | null {
  return validate(
    file,
    maxSizeMb,
    VIDEO_MIME_TYPES,
    VIDEO_EXTENSIONS,
    "video",
    VIDEO_FORMATS_LABEL,
  );
}

/** The image counterpart of {@link validateVideoFile}. */
export function validateImageFile(file: File, maxSizeMb: number): string | null {
  return validate(
    file,
    maxSizeMb,
    IMAGE_MIME_TYPES,
    IMAGE_EXTENSIONS,
    "image",
    IMAGE_FORMATS_LABEL,
  );
}

/** The PDF counterpart of {@link validateVideoFile}. */
export function validateDocumentFile(file: File, maxSizeMb: number): string | null {
  return validate(
    file,
    maxSizeMb,
    DOCUMENT_MIME_TYPES,
    DOCUMENT_EXTENSIONS,
    "document",
    DOCUMENT_FORMATS_LABEL,
  );
}

/**
 * Validate a file against the union of all three allowlists, picking the size cap
 * that belongs to whichever kind it turned out to be. Used by pickers that accept
 * more than one kind, where a single ceiling would be either too tight for video or
 * far too loose for a PDF.
 */
export function validateAnyMediaFile(
  file: File,
  limits: { maxImageMb: number; maxVideoMb: number; maxDocumentMb: number },
): string | null {
  const declared = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  const isImage =
    (IMAGE_MIME_TYPES as readonly string[]).includes(declared) ||
    (!declared && IMAGE_EXTENSIONS.some((e) => name.endsWith(e)));
  if (isImage) return validateImageFile(file, limits.maxImageMb);

  const isVideo =
    (VIDEO_MIME_TYPES as readonly string[]).includes(declared) ||
    (!declared && VIDEO_EXTENSIONS.some((e) => name.endsWith(e)));
  if (isVideo) return validateVideoFile(file, limits.maxVideoMb);

  const isDocument =
    (DOCUMENT_MIME_TYPES as readonly string[]).includes(declared) ||
    (!declared && DOCUMENT_EXTENSIONS.some((e) => name.endsWith(e)));
  if (isDocument) return validateDocumentFile(file, limits.maxDocumentMb);

  return `${file.name} is not a supported file. Use ${ANY_MEDIA_FORMATS_LABEL}.`;
}

function validate(
  file: File,
  maxSizeMb: number,
  mimeTypes: readonly string[],
  extensions: readonly string[],
  noun: string,
  formatsLabel: string,
): string | null {
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `${file.name} is ${formatFileSize(file.size)} — the limit is ${maxSizeMb} MB.`;
  }
  if (file.size === 0) {
    return `${file.name} is empty.`;
  }

  // An empty `file.type` is common for .mov on Windows and for files dragged out
  // of some archive tools, so fall back to the extension rather than refusing a
  // file the API would happily accept.
  const declared = file.type.toLowerCase();
  const accepted = declared
    ? mimeTypes.includes(declared)
    : extensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  return accepted ? null : `${file.name} is not a supported ${noun}. Use ${formatsLabel}.`;
}

/** Byte count in the largest unit that keeps it readable (MB, or GB past 1024). */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
