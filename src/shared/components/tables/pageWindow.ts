/**
 * The page numbers to show (0-indexed) with "gap" for an ellipsis: the first
 * and last page, the current one and `siblings` either side. Past seven pages
 * (siblings = 1) the list is always seven long, so the buttons hold still.
 */
export function pageWindow(page: number, count: number, siblings = 1): (number | "gap")[] {
  if (count <= 1) return [0];
  // Worked 1-indexed (as MUI's usePagination), converted at the end.
  const cur = page + 1;
  const range = (a: number, b: number) => Array.from({ length: Math.max(b - a + 1, 0) }, (_, i) => a + i);
  const start = Math.max(Math.min(cur - siblings, count - siblings * 2 - 2), 3);
  const end = Math.min(Math.max(cur + siblings, siblings * 2 + 3), count - 2);
  const items: (number | "gap")[] = [
    1,
    ...(start > 3 ? ["gap" as const] : 2 < count ? [2] : []),
    ...range(start, end),
    ...(end < count - 2 ? ["gap" as const] : count - 1 > 1 ? [count - 1] : []),
    count,
  ];
  // Small counts can list a page twice (e.g. count 3); keep the first.
  const out: (number | "gap")[] = [];
  for (const p of items) {
    if (p === "gap") out.push(p);
    else if (!out.includes(p - 1)) out.push(p - 1);
  }
  return out;
}
