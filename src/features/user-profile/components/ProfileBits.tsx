import { useId } from "react";
import { Link } from "react-router";
import { ExternalLink as ExternalLinkIcon, type LucideIcon } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";
import { cn } from "@shared/lib/cn";
import { DASH, displayUrl } from "@features/user-profile/lib/format";

/*
 * Small read-only pieces the profile page's tabs share. They reuse the
 * dashboard's recipes (FormCard titles, `.fact`, `.meta`, the tinted notes
 * on the participants page) rather than adding new ones.
 */

/** A value that may be missing: the text, or a quiet dash. */
export function Value({ children, mono, className }: { children?: React.ReactNode; mono?: boolean; className?: string }) {
  // `false` too: callers write `value != null && format(value)`, which is false, not null.
  const empty = children === null || children === undefined || children === "" || children === false;
  if (empty) return <span className="text-ink-3">{DASH}</span>;
  return <span className={cn(mono && "font-mono text-[13px] tracking-normal", className)}>{children}</span>;
}

/**
 * An unboxed section of a tab (the page pattern for a section over its own
 * cards or table): the title in the FormCard face with a quiet count after
 * it, an optional line under it, then the content.
 */
export function ProfileSection({
  title,
  count,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  count?: number;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn("space-y-3.5", className)}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-[19px] font-bold leading-tight tracking-[-0.018em] text-ink">
            {title}
            {count !== undefined && (
              <span className="ml-2 align-[2px] text-[13px] font-semibold tracking-normal text-ink-3 tabular-nums">{count}</span>
            )}
          </h2>
          {description && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Label-over-value pairs on a two-column grid (one column on phones, or always with `single`). */
export function DetailList({ children, single, className }: { children: React.ReactNode; single?: boolean; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", !single && "sm:grid-cols-2", className)}>{children}</dl>
  );
}

export function Detail({
  label,
  children,
  wide,
  className,
}: {
  label: string;
  children: React.ReactNode;
  /** Take both columns (long text: a bio, a list of qualifications). */
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2", className)}>
      <dt className="text-[12.5px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 break-words text-[14.5px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

/** Free text as it was typed: line and paragraph breaks kept, never parsed as markup. */
export function PlainText({ value, className }: { value?: string | null; className?: string }) {
  if (!value?.trim()) return <Value />;
  return <span className={cn("block whitespace-pre-line", className)}>{value.trim()}</span>;
}

/**
 * An address typed by a user, opened in a new tab with no access back to this
 * page. `href` must come from `safeExternalUrl`; anything that failed that
 * check is shown as plain text, so it can never become a link.
 */
export function SafeLink({ href, text }: { href: string | null; text?: string | null }) {
  if (!href) return <Value>{text?.trim() || undefined}</Value>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      className="inline-flex max-w-full items-center gap-1.5 font-medium text-navy decoration-gold decoration-2 underline-offset-4 hover:underline"
    >
      <span className="truncate">{displayUrl(href)}</span>
      <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** A course's title, linking to its admin page (editor, roster and İştirakçilər). */
export function CourseLink({ course, className }: { course: { id: string; title: string }; className?: string }) {
  return (
    <Link
      to={ROUTES.adminCourseEdit(course.id)}
      className={cn(
        "break-words font-semibold leading-snug text-ink decoration-gold decoration-2 underline-offset-4 hover:underline",
        className,
      )}
    >
      {course.title}
    </Link>
  );
}

/**
 * One fact of the strip under the header (`.fact` from index.css): a quiet
 * label with its icon over the value, as on My profile.
 */
export function Fact({
  Icon,
  label,
  children,
  className,
}: {
  Icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fact bg-surface px-4 py-4 sm:px-5", className)}>
      <dt className="l">
        <Icon aria-hidden />
        {label}
      </dt>
      <dd className="v text-[14.5px] sm:text-[15px]">{children}</dd>
    </div>
  );
}

/** A tinted notice (the participants page's "No account" box): what is wrong with the account, in one look. */
export function Notice({
  tone,
  Icon,
  title,
  children,
}: {
  tone: "danger" | "warning";
  Icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-[18px] p-4 text-sm", tone === "danger" ? "bg-danger-tint" : "bg-warn-tint")}>
      <Icon aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", tone === "danger" ? "text-danger" : "text-warn")} />
      <div className="min-w-0">
        <p className="break-words font-semibold text-ink">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

/** A 0–5 rating as the website's stars, with the number for screen readers. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span role="img" aria-label={`${rating} out of 5`} className={cn("stars", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden className={i < filled ? undefined : "off"}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}
