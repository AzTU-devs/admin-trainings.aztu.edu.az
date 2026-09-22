/**
 * A course title as the breadcrumb's record crumb (PageHeader `crumbLabel`)
 * on a course's pages: its readable name instead of a clipped id or slug, cut
 * to about 32 characters so a long course name does not push the crumb row
 * onto a second line. The full title is on the page itself (the H1, or the
 * description on the participants page).
 */
export function courseCrumb(title: string | null | undefined, max = 32): string | undefined {
  const text = title?.trim();
  if (!text) return undefined;
  // By code point, so a cut never splits a surrogate pair.
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : text;
}
