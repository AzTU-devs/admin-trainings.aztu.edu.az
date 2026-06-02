import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { VideoAsset } from "@features/videos/types";

export const videosApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listVideos: build.query<ApiPage<VideoAsset>, PageRequest | void>({
      query: (params) => ({ url: "/videos", method: "GET", params: params ?? undefined }),
      providesTags: (res) =>
        res
          ? [...res.content.map((v) => ({ type: "Video" as const, id: v.id })), { type: "Video" as const, id: "LIST" }]
          : [{ type: "Video", id: "LIST" }],
    }),
    initVideoUpload: build.mutation<{ uploadUrl: string; videoId: number }, { filename: string; sizeBytes: number; mime: string }>({
      query: (body) => ({ url: "/videos/init", method: "POST", data: body }),
    }),
    completeVideoUpload: build.mutation<VideoAsset, { videoId: number; title?: string }>({
      query: ({ videoId, ...body }) => ({ url: `/videos/${videoId}/complete`, method: "POST", data: body }),
      invalidatesTags: [{ type: "Video", id: "LIST" }],
    }),
    deleteVideo: build.mutation<void, number>({
      query: (id) => ({ url: `/videos/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Video", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListVideosQuery,
  useInitVideoUploadMutation,
  useCompleteVideoUploadMutation,
  useDeleteVideoMutation,
} = videosApi;
