import { Helmet } from "react-helmet-async";
import { Breadcrumbs } from "./Breadcrumbs";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Suppress the breadcrumbs row (useful on dashboard root). */
  hideBreadcrumbs?: boolean;
  /** Document title — defaults to `<title> · AzTU Portal`. */
  documentTitle?: string;
  /**
   * What the record crumb says on a record's page (e.g. the course title on
   * /admin/courses/:id). Without it the id or slug is shown, short and in mono.
   */
  crumbLabel?: string;
}

/**
 * The top of every page, as on the website's catalogue: breadcrumbs in ink-3,
 * the title in Albert Sans 800 (`.page-title`, 28–38px), the description in
 * ink-2, and pill actions on the right, aligned with the description.
 * Long titles (course names) wrap rather than being cut off.
 */
export function PageHeader({
  title,
  description,
  actions,
  hideBreadcrumbs,
  documentTitle,
  crumbLabel,
}: Props) {
  return (
    <div className="mb-7 lg:mb-8">
      <Helmet>
        <title>{documentTitle ?? `${title} · AzTU Portal`}</title>
      </Helmet>
      {!hideBreadcrumbs && (
        <div className="mb-3">
          <Breadcrumbs recordLabel={crumbLabel} />
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title break-words">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
