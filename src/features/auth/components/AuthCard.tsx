import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@shared/lib/cn";

/**
 * The white card every auth page is built on — the website's AuthCard: an
 * icon squircle, the page title (the page's h1) and a short lead, then the
 * form. `footer` sits inside the card under a hairline.
 *
 * `tone` only colours the icon squircle: navy for a form, ok-green for "done".
 */
export function AuthCard({
  icon,
  title,
  subtitle,
  children,
  footer,
  tone = "navy",
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "navy" | "ok";
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-[30rem]", className)}>
      <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-md)] sm:p-10">
        <header className={children ? "mb-8" : undefined}>
          <span
            aria-hidden
            className={cn(
              "grid size-12 place-items-center rounded-[16px] [&_svg]:size-5",
              tone === "ok" ? "bg-ok-tint text-ok" : "bg-navy-tint text-navy",
            )}
          >
            {icon}
          </span>
          <h1 className="mt-6 text-balance font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.028em] text-ink sm:text-[2rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-ink-2">{subtitle}</p>
          ) : null}
        </header>

        {children}

        {footer ? (
          <div className="mt-8 border-t border-line pt-6 text-center text-sm text-ink-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

/** The quiet way back to sign-in, used in the card footer of the recovery page. */
export function AuthBackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-navy transition-colors duration-200 hover:bg-navy-tint"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/**
 * Label + control + error, the way the website's auth forms lay a field out.
 *
 * `aside` (the "Forgot password?" link) sits on the label's row, but it is
 * rendered last and placed there by the grid: in DOM order it follows the
 * control, so Tab from Email reaches the password field, not the link.
 */
export function AuthField({
  label,
  htmlFor,
  error,
  errorId,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  /** Id for the error line, so the input can point at it with aria-describedby. */
  errorId?: string;
  /** Something on the label's row, right-aligned (the "Forgot password?" link). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
      <label htmlFor={htmlFor} className="col-start-1 row-start-1 self-center text-[13.5px] font-semibold text-ink">
        {label}
      </label>
      <div className="col-span-2 row-start-2">{children}</div>
      {error && (
        <p id={errorId} className="col-span-2 row-start-3 text-[12.5px] leading-snug text-danger">
          {error}
        </p>
      )}
      {aside && <div className="col-start-2 row-start-1 self-center justify-self-end">{aside}</div>}
    </div>
  );
}
