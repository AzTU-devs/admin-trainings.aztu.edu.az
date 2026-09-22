import { Link, useLocation } from "react-router";
import { Home } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

/**
 * Path segments that only namespace routes — `/admin`, `/super`, `/tutor` are
 * not themselves routable, so they are rendered as plain labels. Linking them
 * would drop the user on the catch-all 404.
 */
const NON_ROUTABLE = new Set(["admin", "super", "tutor"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Collections whose next segment is a record (a UUID or a slug), not a page. */
const RECORD_PARENTS = new Set(["courses"]);
const PAGES = new Set(["new", "edit", "participants"]);

/** "room-pricing" → "Room Pricing": the words of the path segment, as before. */
function humanize(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Crumb = { to: string; routable: boolean } & (
  | { kind: "text"; label: string }
  | { kind: "id"; value: string }
);

export function Breadcrumbs({ recordLabel }: { recordLabel?: string }) {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0 || pathname === ROUTES.dashboard) return null;

  let acc = "";
  const crumbs: Crumb[] = parts.map((p, i) => {
    acc += `/${p}`;
    const routable = !NON_ROUTABLE.has(p);
    const isRecord = UUID.test(p) || /^\d+$/.test(p) || (RECORD_PARENTS.has(parts[i - 1] ?? "") && !PAGES.has(p));
    if (isRecord) {
      return recordLabel
        ? { kind: "text", label: recordLabel, to: acc, routable }
        : { kind: "id", value: decodeURIComponent(p), to: acc, routable };
    }
    return { kind: "text", label: humanize(p), to: acc, routable };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-[13px]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-3">
        <li>
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center gap-1 rounded-full transition-colors hover:text-ink"
          >
            <Home className="size-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const label = c.kind === "id" ? <RecordId value={c.value} /> : c.label;
          return (
            <li key={c.to} className="flex min-w-0 items-center gap-2">
              {/* The website's separator: a quiet slash. */}
              <span aria-hidden className="text-line-2">/</span>
              {last ? (
                <span aria-current="page" className="min-w-0 truncate font-medium text-ink-2">
                  {label}
                </span>
              ) : c.routable ? (
                <Link to={c.to} className="min-w-0 truncate rounded-full transition-colors hover:text-ink">
                  {label}
                </Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * A record's id or slug in a crumb: mono, as it is spelled (dashes kept), a
 * UUID cut to its first eight characters with the whole value on hover. A
 * UUID with its dashes turned into spaces read as a broken line of hex.
 */
function RecordId({ value }: { value: string }) {
  const short = UUID.test(value) ? `${value.slice(0, 8)}…` : value.length > 28 ? `${value.slice(0, 26)}…` : value;
  return (
    <span title={value} className="font-mono text-[12px]">
      {short}
    </span>
  );
}
