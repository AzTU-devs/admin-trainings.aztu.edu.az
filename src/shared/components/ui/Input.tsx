import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, rightSlot, ...props }, ref) => {
    const field = cn(
      "h-10 w-full rounded-xl border bg-white dark:bg-gray-dark px-3.5 text-sm",
      "text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
      "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500",
      "transition-shadow disabled:opacity-60 disabled:cursor-not-allowed",
      invalid
        ? "border-error-300 dark:border-error-500/60 focus:border-error-500 focus:ring-error-500/15"
        : "border-gray-200 dark:border-gray-700",
      leftIcon && "pl-10",
      rightSlot && "pr-10",
    );

    // With an adornment the input is wrapped, so the caller's `className` has to
    // land on the *wrapper* — it is what participates in the parent's layout.
    // Leaving it on the input would collapse the wrapper to zero intrinsic width
    // inside a flex row and clip the placeholder.
    if (leftIcon || rightSlot) {
      return (
        <div className={cn("relative w-full", className)}>
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input ref={ref} className={field} {...props} />
          {rightSlot && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
      );
    }

    return <input ref={ref} className={cn(field, className)} {...props} />;
  },
);
Input.displayName = "Input";
