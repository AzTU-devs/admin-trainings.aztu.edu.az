import { useMemo } from "react";
import { cn } from "@shared/lib/cn";
import { looksLikeHtml, sanitizeRichText } from "@shared/lib/richText";

interface RichTextViewProps {
  value: string | null | undefined;
  className?: string;
  /** Shown when there is nothing to render; omit to render nothing. */
  fallback?: React.ReactNode;
}

/**
 * Read-only counterpart of <RichTextEditor>: markup is sanitised to the shared
 * allowlist and rendered with the same typography as the editor; a legacy
 * plain-text value is shown as text with its line breaks kept.
 */
export function RichTextView({ value, className, fallback = null }: RichTextViewProps) {
  const html = useMemo(() => (value && looksLikeHtml(value) ? sanitizeRichText(value) : null), [value]);

  if (!value || !value.trim()) return <>{fallback}</>;
  if (html === null) {
    return <p className={cn("whitespace-pre-line text-sm leading-relaxed text-ink-2", className)}>{value}</p>;
  }
  return <div className={cn("rich-text text-sm text-ink-2", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
