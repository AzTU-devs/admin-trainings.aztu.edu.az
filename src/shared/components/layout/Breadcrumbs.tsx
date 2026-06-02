import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

function humanize(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0 || pathname === ROUTES.dashboard) return null;

  let acc = "";
  const crumbs = parts.map((p) => {
    acc += `/${p}`;
    return { label: humanize(p), to: acc };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center flex-wrap gap-1.5 text-gray-500 dark:text-gray-400">
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
                <span className="font-medium text-gray-900 dark:text-white">{c.label}</span>
              ) : (
                <Link to={c.to} className="hover:text-brand-700 dark:hover:text-white">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
