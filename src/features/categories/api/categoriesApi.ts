import { baseApi } from "@lib/query/baseApi";
import type { NormalizedError } from "@lib/axios/httpClient";
import type { UUID } from "@shared/types/lms";
import type { CategoryDto, CategoryNode, CategoryUpsertRequest } from "@features/categories/types";

/** Deeper than any real taxonomy; bounds the walk if the data ever holds a cycle. */
const MAX_DEPTH = 6;

/**
 * Which list to read. "admin" is every category, hidden ones included, from
 * `GET /admin/categories` (needs category:manage). "public" is what anyone may
 * see — the active categories — for the pickers tutors use.
 */
export type CategoryScope = "admin" | "public";

/** Places a flat list in the tree, depth-first, keeping the API's order among siblings. */
export function buildCategoryTree(flat: CategoryDto[]): CategoryNode[] {
  const ids = new Set(flat.map((c) => c.id));
  const childrenOf = new Map<string, CategoryDto[]>();
  const roots: CategoryDto[] = [];
  for (const c of flat) {
    // A parent that is not in the list (deleted, or hidden from this scope)
    // leaves the child at the top level rather than out of the list.
    if (c.parentId && ids.has(c.parentId)) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c);
      childrenOf.set(c.parentId, list);
    } else {
      roots.push(c);
    }
  }
  const out: CategoryNode[] = [];
  const seen = new Set<string>();
  const place = (list: CategoryDto[], depth: number, parentPath: string) => {
    for (const c of list) {
      if (seen.has(c.id) || depth > MAX_DEPTH) continue;
      seen.add(c.id);
      const path = parentPath ? `${parentPath} › ${c.name}` : c.name;
      out.push({ ...c, depth, path });
      place(childrenOf.get(c.id) ?? [], depth + 1, path);
    }
  };
  place(roots, 0, "");
  return out;
}

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Every category of the scope, flattened depth-first with its depth and
     * "Parent › Child" path.
     *
     * The page used to read `GET /public/categories`, which returns only the top
     * level, so sub-categories never appeared on the categories page or in the
     * course pickers (a course filed under one showed its raw UUID). Staff read
     * the flat admin list; the public scope walks
     * `/public/categories/{id}/children`, one parallel request per category per
     * level, because the API has no flat public list. An API without the admin
     * list (404/405) falls back to that walk too.
     */
    listCategories: build.query<CategoryNode[], CategoryScope | void>({
      async queryFn(scope, _api, _extra, baseQuery) {
        if (scope === "admin") {
          const all = await baseQuery({ url: "/admin/categories", method: "GET" });
          if (!all.error) return { data: buildCategoryTree((all.data as CategoryDto[]) ?? []) };
          // An API without the admin list answers 405 (the path exists for POST) or 404.
          const status = (all.error as NormalizedError).status;
          if (status !== 404 && status !== 405) return { error: all.error as NormalizedError };
        }

        const roots = await baseQuery({ url: "/public/categories", method: "GET" });
        if (roots.error) return { error: roots.error as NormalizedError };
        const flat: CategoryDto[] = [...((roots.data as CategoryDto[]) ?? [])];
        const seen = new Set(flat.map((c) => c.id));
        let level = flat;
        for (let depth = 0; depth < MAX_DEPTH && level.length > 0; depth++) {
          const results = await Promise.all(
            level.map((c) => baseQuery({ url: `/public/categories/${c.id}/children`, method: "GET" })),
          );
          const next: CategoryDto[] = [];
          for (let i = 0; i < level.length; i++) {
            const r = results[i];
            if (r.error) return { error: r.error as NormalizedError };
            for (const k of (r.data as CategoryDto[]) ?? []) {
              if (seen.has(k.id)) continue;
              seen.add(k.id);
              // The children route implies the parent even if the DTO omits it.
              next.push({ ...k, parentId: k.parentId ?? level[i].id });
            }
          }
          flat.push(...next);
          level = next;
        }
        return { data: buildCategoryTree(flat) };
      },
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

/** Ids of `id` and everything below it — what a category's parent picker must exclude. */
export function subtreeIds(nodes: CategoryNode[], id: UUID): Set<UUID> {
  const out = new Set<UUID>([id]);
  // Depth-first order puts a subtree right after its root, deeper than it.
  const start = nodes.findIndex((n) => n.id === id);
  if (start < 0) return out;
  for (let i = start + 1; i < nodes.length && nodes[i].depth > nodes[start].depth; i++) out.add(nodes[i].id);
  return out;
}
