import { useMemo } from "react";
import { categoryStyle, type HueClass } from "@shared/lib/categoryStyle";
import { useListCategoriesQuery } from "@features/categories/api/categoriesApi";
import type { CategoryDto } from "@features/categories/types";

/**
 * The course's categories, in the order the course lists them, looked up in
 * the category list the editor's category picker already loads — the same
 * cached query, so this costs no extra request.
 */
export function useCourseCategories(categoryIds: readonly string[] | undefined): CategoryDto[] {
  const { data: categories } = useListCategoriesQuery();
  return useMemo(() => {
    if (!categories || !categoryIds?.length) return [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    return categoryIds.map((id) => byId.get(id)).filter((c): c is CategoryDto => !!c);
  }, [categories, categoryIds]);
}

/** The hue a course is drawn in: its first category's, navy when it has none. */
export function courseHue(categories: CategoryDto[]): HueClass {
  return categoryStyle(categories[0] ?? null).k;
}
