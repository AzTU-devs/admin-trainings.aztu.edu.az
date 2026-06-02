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
}

export function PageHeader({
  title,
  description,
  actions,
  hideBreadcrumbs,
  documentTitle,
}: Props) {
  return (
    <div className="mb-6">
      <Helmet>
        <title>{documentTitle ?? `${title} · AzTU Portal`}</title>
      </Helmet>
      {!hideBreadcrumbs && (
        <div className="mb-3">
          <Breadcrumbs />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
