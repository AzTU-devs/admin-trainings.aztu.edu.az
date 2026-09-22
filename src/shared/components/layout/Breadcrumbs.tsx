import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

/**
 * Path segments that only namespace routes — `/admin`, `/super`, `/tutor` are
 * not themselves routable, so they are rendered as plain labels. Linking them
 * would drop the user on the catch-all 404.
 */
const NON_ROUTABLE = new Set(["admin", "super", "tutor"]);

/**
 * Segments whose page title is not their humanized slug. Kept in step with the
 * page headers, so the crumb and the heading under it name the same thing.
 */
const SEGMENT_LABELS: Record<string, string> = {
  students: "İştirakçilər",
  participants: "İştirakçilər",
  "course-moderation": "Course moderation",
  "room-requests": "Room bookings",
  "room-pricing": "Room pricing",
  "api-logs": "API logs",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanize(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param labels  Page-supplied names for dynamic segments, e.g. `{ [courseId]: course.title }`.
 *   Without one a course id used to be humanized into "91bd4646 Ccf3 4c90 …"; an
 *   unlabelled id now reads "Details" until the page knows its name.
 */
export function Breadcrumbs({ labels }: { labels?: Record<string, string> }) {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0 || pathname === ROUTES.dashboard) return null;

  let acc = "";
  const crumbs = parts.map((p) => {
    acc += `/${p}`;
    const label = labels?.[p] ?? SEGMENT_LABELS[p] ?? (UUID_RE.test(p) ? "Details" : humanize(p));
    return { label, to: acc, routable: !NON_ROUTABLE.has(p) };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <li>
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center gap-1 hover:text-brand-700 dark:hover:text-white"
          >
            <Home className="size-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.to} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 text-gray-300 dark:text-gray-600" />
              {last ? (
                <span
                  aria-current="page"
                  className="font-medium text-gray-900 dark:text-white truncate max-w-[16rem]"
                >
                  {c.label}
                </span>
              ) : c.routable ? (
                <Link to={c.to} className="hover:text-brand-700 dark:hover:text-white truncate max-w-[16rem]">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
