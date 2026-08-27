import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

/**
 * Path segments that only namespace routes — `/admin`, `/super`, `/tutor` are
 * not themselves routable, so they are rendered as plain labels. Linking them
 * would drop the user on the catch-all 404.
 */
const NON_ROUTABLE = new Set(["admin", "super", "tutor"]);

function humanize(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0 || pathname === ROUTES.dashboard) return null;

  let acc = "";
  const crumbs = parts.map((p) => {
    acc += `/${p}`;
    return { label: humanize(p), to: acc, routable: !NON_ROUTABLE.has(p) };
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
                  className="font-medium text-gray-900 dark:text-white"
                >
                  {c.label}
                </span>
              ) : c.routable ? (
                <Link to={c.to} className="hover:text-brand-700 dark:hover:text-white">
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
