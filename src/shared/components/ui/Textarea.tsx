import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-xl border bg-white dark:bg-gray-dark px-3.5 py-2.5 text-sm",
        "text-gray-900 dark:text-white placeholder:text-gray-400",
        "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500",
        "transition-shadow resize-y disabled:opacity-60",
        invalid
          ? "border-error-300 focus:border-error-500 focus:ring-error-500/15"
          : "border-gray-200 dark:border-gray-700",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
