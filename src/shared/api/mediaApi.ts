import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { env } from "@shared/config/env";
import type { UUID } from "@shared/types/lms";
import type { MediaFileDto } from "@shared/types/media";

/**
 * Generic binary media upload. Posts a multipart body to `/media` and returns
 * the stored file's metadata (notably `id`, used as e.g. a lesson's
 * `videoMediaId`).
 *
 * The `Content-Type: multipart/form-data` header is set so the shared axios
 * client doesn't JSON-encode the FormData; the browser then fills in the
 * multipart boundary itself.
 */
export const mediaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadMedia: build.mutation<MediaFileDto, File>({
      query: (file) => {
        const form = new FormData();
        form.append("file", file);
        return {
          url: "/media",
          method: "POST",
          data: form,
          headers: { "Content-Type": "multipart/form-data" },
          timeout: UPLOAD_TIMEOUT_MS,
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const { useUploadMediaMutation } = mediaApi;

/**
 * Uploads are exempt from the client's 30 s request timeout: a 200 MB image or
 * PDF on a campus uplink takes minutes, and the timeout used to abort it
 * part-way with a generic "timeout of 30000ms exceeded". Zero means none; a
 * dead connection still ends in a network error.
 */
const UPLOAD_TIMEOUT_MS = 0;

/**
 * The same upload as {@link useUploadMediaMutation}, for callers that show
 * progress or let the user stop it — the course cover and trailer. Resolves
 * with the stored file's metadata; rejects with the normalised API error
 * (or an AbortError when `signal` fires).
 */
export async function uploadMediaFile(
  file: File,
  opts: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {},
): Promise<MediaFileDto> {
  const form = new FormData();
  form.append("file", file);
  const res = await httpClient.post<{ data: MediaFileDto }>("/media", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
    signal: opts.signal,
    onUploadProgress: (e) => {
      if (opts.onProgress && e.total) opts.onProgress((e.loaded / e.total) * 100);
    },
  });
  return res.data.data;
}

/** Absolute URL for streaming a media file's bytes (auth required). */
export function mediaContentUrl(id: UUID): string {
  return `${env.api.baseUrl}/media/${id}/content`;
}
