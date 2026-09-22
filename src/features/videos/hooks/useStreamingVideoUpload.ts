import { useCallback } from "react";
import { env, resolveApiUrl } from "@shared/config/env";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import { videoContentType } from "@shared/components/upload/uploadConstraints";
import {
  useCompleteVideoUploadMutation,
  useInitVideoUploadMutation,
} from "@features/videos/api/videosApi";
import type { VideoAsset } from "@features/videos/types";

/**
 * A refused upload comes back as the API's `ApiError` body — `UPLOAD_TOO_LARGE`,
 * `MEDIA_TYPE_MISMATCH`, `NOT_A_VIDEO` and so on, each with a sentence worth
 * showing. Falling back to "HTTP 415" throws that away.
 */
function uploadErrorMessage(xhr: XMLHttpRequest): string {
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

export type StreamingVideoUpload = (
  file: File,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
) => Promise<VideoAsset>;

/**
 * The only way a video bigger than the multipart cap reaches the API:
 * `POST /videos/init` → raw `PUT /videos/{id}/content` → `POST /videos/{id}/complete`.
 *
 * It used to live inside the video library page alone, while the lesson and
 * trailer fields posted video through multipart `POST /api/media` — which the API
 * caps at 32 MB on purpose (see application.properties), so every real lecture
 * recording failed with a bare "Upload failed" under a hint promising 512 MB.
 * Shared here so all three upload video the same way. The returned asset's `id`
 * is a media-file id, usable directly as `videoMediaId` / `trailerMediaId`.
 *
 * Requires `course:create` (tutors). The API does not grant it to staff yet.
 */
export function useStreamingVideoUpload(): StreamingVideoUpload {
  const [initUpload] = useInitVideoUploadMutation();
  const [completeUpload] = useCompleteVideoUploadMutation();

  return useCallback<StreamingVideoUpload>(
    async (file, onProgress, signal) => {
      // The API treats an unrecognized type as "no claim made" and decides from the
      // file's own leading bytes; guessing video/mp4 for a .mov whose type the
      // browser did not report would instead come back as MEDIA_TYPE_MISMATCH.
      const contentType = videoContentType(file);
      const { uploadUrl, videoId } = await initUpload({
        filename: file.name,
        sizeBytes: file.size,
        mime: contentType,
      }).unwrap();

      // `uploadUrl` is root-relative (e.g. "/api/videos/{id}/content"); resolve it
      // against the API base origin so the PUT reaches the backend, not this app.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", resolveApiUrl(uploadUrl));
        xhr.setRequestHeader("Content-Type", contentType);
        // Despite the name this is the authenticated PUT, not a presigned URL, so
        // the bearer token axios would attach is set by hand. This raw PUT also
        // bypasses the refresh interceptor, so a token that expires mid-upload
        // surfaces as the 401 message rather than silently re-sending the file.
        const token = appStorage.get<string>(STORAGE_KEYS.accessToken);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        // XHR rather than fetch because only XHR reports upload progress. The
        // whole file goes in one request: the API has no resume offset.
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(uploadErrorMessage(xhr)));
        xhr.onerror = () => reject(new Error("Network error — the upload was interrupted."));
        xhr.onabort = () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        signal.addEventListener("abort", () => xhr.abort());
        xhr.send(file);
      });

      return completeUpload({ videoId, title: file.name }).unwrap();
    },
    [initUpload, completeUpload],
  );
}
