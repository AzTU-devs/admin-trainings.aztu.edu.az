import { httpClient } from "@lib/axios/httpClient";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import { env, resolveApiUrl } from "@shared/config/env";
import { videoContentType } from "@shared/components/upload/uploadConstraints";

/**
 * A refused upload comes back as the API's `ApiError` body — `UPLOAD_TOO_LARGE`,
 * `MEDIA_TYPE_MISMATCH`, `NOT_A_VIDEO` and so on, each with a sentence worth
 * showing. Falling back to "HTTP 415" throws that away.
 */
export function videoUploadErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // Not JSON: nginx answers an over-limit body with its own HTML page, and a
    // request that never reached the API has no body at all.
  }
  if (xhr.status === 413) {
    return `The server refused the file as too large (limit ${env.uploads.maxVideoMb} MB).`;
  }
  if (xhr.status === 401) {
    return "Your session expired during the upload. Sign in again and retry.";
  }
  return `Upload failed (HTTP ${xhr.status}).`;
}

/**
 * Send the raw bytes to the URL returned by /videos/init. Despite the name
 * "uploadUrl" this is the authenticated `PUT /api/videos/{id}/content` — NOT an
 * anonymous presigned URL — so the Bearer token that axios would normally
 * attach has to be set by hand here.
 *
 * The whole file goes in one request: the API exposes no chunk or resume
 * offset, so an interrupted upload restarts from zero. XHR rather than fetch
 * because only XHR reports upload progress.
 */
export function putVideoBytes(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // `uploadUrl` is root-relative (e.g. "/api/videos/{id}/content"); resolve it
    // against the API base origin so the PUT reaches the backend, not this app.
    xhr.open("PUT", resolveApiUrl(uploadUrl));
    xhr.setRequestHeader("Content-Type", contentType);
    // Access token only — the refresh token is an httpOnly cookie this app
    // cannot read. This raw PUT also bypasses the axios refresh interceptor, so
    // a token that expires mid-upload surfaces as the 401 message above rather
    // than silently retrying half a gigabyte.
    const token = appStorage.get<string>(STORAGE_KEYS.accessToken);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(videoUploadErrorMessage(xhr)));
    xhr.onerror = () => reject(new Error("Network error — the upload was interrupted."));
    xhr.onabort = () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/**
 * The whole streaming video flow — init, PUT the bytes, complete — for callers
 * that only need the stored file's id (a course trailer). The video library
 * page runs the same three steps through its RTK Query mutations so its list
 * refreshes.
 *
 * Only callers holding `course:create` (experts) or `course:create_any` (super
 * admins) may use it; anyone else uploads a video through multipart /media.
 * Resolves with the media id, which is what `trailerMediaId` takes.
 */
export async function uploadVideoFile(
  file: File,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<string> {
  // The API treats an unrecognized type as "no claim made" and decides from the
  // file's own leading bytes; guessing video/mp4 for a .mov whose type the
  // browser did not report would instead come back as MEDIA_TYPE_MISMATCH.
  const contentType = videoContentType(file);
  const init = await httpClient.post<{ data: { uploadUrl: string; videoId: string } }>("/videos/init", {
    filename: file.name,
    sizeBytes: file.size,
    mime: contentType,
  });
  const { uploadUrl, videoId } = init.data.data;
  await putVideoBytes(uploadUrl, file, contentType, onProgress, signal);
  await httpClient.post(`/videos/${videoId}/complete`, { title: file.name });
  return videoId;
}
