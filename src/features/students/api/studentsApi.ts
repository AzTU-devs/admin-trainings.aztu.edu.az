import { baseApi } from "@lib/query/baseApi";
import type { ApiPage, PageRequest } from "@shared/types/api";
import type { Student } from "@features/students/types";

interface ListStudentsArgs extends PageRequest {
  search?: string;
  courseId?: number;
}

export const studentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMyStudents: build.query<ApiPage<Student>, ListStudentsArgs | void>({
      query: (params) => ({ url: "/tutor/students", method: "GET", params: params ?? undefined }),
      providesTags: (res) =>
        res
          ? [...res.content.map((s) => ({ type: "Student" as const, id: s.id })), { type: "Student" as const, id: "LIST" }]
          : [{ type: "Student", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useListMyStudentsQuery } = studentsApi;
