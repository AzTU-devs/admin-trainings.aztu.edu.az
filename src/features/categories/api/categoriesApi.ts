import { baseApi } from "@lib/query/baseApi";
import type { UUID } from "@shared/types/lms";
import type { CategoryDto, CategoryUpsertRequest } from "@features/categories/types";

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Public list (flat array, not paged) — backend `GET /api/public/categories`. */
    listCategories: build.query<CategoryDto[], void>({
      query: () => ({ url: "/public/categories", method: "GET" }),
      providesTags: [{ type: "Category", id: "LIST" }],
    }),
    createCategory: build.mutation<CategoryDto, CategoryUpsertRequest>({
      query: (body) => ({ url: "/admin/categories", method: "POST", data: body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    updateCategory: build.mutation<CategoryDto, { id: UUID; body: CategoryUpsertRequest }>({
      query: ({ id, body }) => ({ url: `/admin/categories/${id}`, method: "PUT", data: body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    deleteCategory: build.mutation<void, UUID>({
      query: (id) => ({ url: `/admin/categories/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
