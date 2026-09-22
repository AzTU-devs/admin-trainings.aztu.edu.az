import { useState } from "react";
import { cn } from "@shared/lib/cn";
import { HELPDESK_EMAIL, helpdeskMailto } from "@shared/constants/support";
import { isChunkLoadError } from "./chunkError";

/** Mail clients cut very long mailto: links; the copied details carry the rest. */
const MAILTO_BODY_MAX = 1500;

/**
 * Copies the crash details. The clipboard API needs a secure context and a
 * permission; when it is refused the details stay visible under "Technical
 * details" to select by hand, and the button says so rather than failing silently.
 */
function CopyDetailsButton({ details }: { details: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setState("copied");
    } catch {
      setState("failed");
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed, select below" : "Copy details"}
    </button>
  );
}

/**
 * What a crashed page or app shows: what happened, the error ID to quote, the
 * details to copy, and a way out (try again / reload). Kept apart from the
 * ErrorBoundary class so this file exports only components (fast refresh).
 */
export function ErrorFallback({
  error,
  digest,
  details,
  onReset,
  variant,
}: {
  error: Error;
  digest: string;
  details: string | null;
  onReset: () => void;
  variant: "screen" | "page";
}) {
  const chunk = isChunkLoadError(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-center p-6",
        variant === "screen" ? "min-h-screen bg-gray-50 dark:bg-gray-900" : "min-h-[50vh]",
      )}
    >
      <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-8 shadow-theme-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-error-50 text-error-600 flex items-center justify-center dark:bg-error-500/10 dark:text-error-400">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {chunk ? "The portal was updated" : "Something went wrong"}
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 break-words">
          {chunk
            ? "This page was built for an older version. Reload to get the current one."
            : error.message || "An unexpected error occurred."}
        </p>
        {!chunk && (
          <div className="mb-6 rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-gray-600 dark:text-gray-300">
                Error ID <code className="font-mono font-semibold text-gray-900 dark:text-white">{digest}</code>
              </p>
              {details && <CopyDetailsButton details={details} />}
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              If it keeps happening, send this ID and the copied details to{" "}
              <a
                href={helpdeskMailto(`Dashboard error ${digest}`, details?.slice(0, MAILTO_BODY_MAX))}
                className="font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                {HELPDESK_EMAIL}
              </a>
              .
            </p>
            {details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">Technical details</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                  {details}
                </pre>
              </details>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2.5"
          >
            {chunk ? "Reload" : "Try again"}
          </button>
          {!chunk && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Reload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
