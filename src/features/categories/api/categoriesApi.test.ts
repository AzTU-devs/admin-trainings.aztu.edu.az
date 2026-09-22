import { describe, expect, it } from "vitest";
import { buildCategoryTree, subtreeIds } from "./categoriesApi";
import type { CategoryDto } from "@features/categories/types";

const cat = (id: string, name: string, parentId: string | null = null): CategoryDto => ({
  id,
  name,
  parentId,
  slug: id,
  sortOrder: 0,
  active: true,
});

describe("buildCategoryTree", () => {
  const flat = [cat("it", "IT"), cat("db", "Databases", "it"), cat("pg", "Postgres", "db"), cat("art", "Art")];

  it("orders depth-first with depth and a Parent › Child path", () => {
    expect(buildCategoryTree(flat).map((n) => [n.id, n.depth, n.path])).toEqual([
      ["it", 0, "IT"],
      ["db", 1, "IT › Databases"],
      ["pg", 2, "IT › Databases › Postgres"],
      ["art", 0, "Art"],
    ]);
  });

  it("keeps an orphan at the top level instead of dropping it", () => {
    expect(buildCategoryTree([cat("x", "Orphan", "missing")]).map((n) => n.depth)).toEqual([0]);
  });

  it("survives a parent cycle", () => {
    const tree = buildCategoryTree([cat("a", "A", "b"), cat("b", "B", "a"), cat("r", "Root")]);
    expect(tree.map((n) => n.id)).toEqual(["r"]);
  });

  it("subtreeIds excludes a category and its descendants from its own parent picker", () => {
    expect([...subtreeIds(buildCategoryTree(flat), "it")].sort()).toEqual(["db", "it", "pg"]);
  });
});
