import { baseApi } from "@lib/query/baseApi";
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
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const { useUploadMediaMutation } = mediaApi;

/** Absolute URL for streaming a media file's bytes (auth required). */
export function mediaContentUrl(id: UUID): string {
  return `${env.api.baseUrl}/media/${id}/content`;
}
