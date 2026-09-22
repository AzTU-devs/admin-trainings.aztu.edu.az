import { forwardRef } from "react";
import { Button, type ButtonProps } from "@shared/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/Tooltip";
import { cn } from "@shared/lib/cn";

/**
 * A destructive icon at rest is quiet ink-3 and only turns red on hover or
 * keyboard focus (the uploaders' remove buttons do the same): a column of
 * always-red bins down a table is the loudest thing on the page, and it pulls
 * the eye off the names and statuses.
 */
export const QUIET_DANGER =
  "text-ink-3 hover:bg-danger-tint hover:text-danger focus-visible:bg-danger-tint focus-visible:text-danger";

interface Props extends Omit<ButtonProps, "variant" | "size" | "aria-label"> {
  /** The accessible name, also shown as the tooltip. */
  label: string;
  /** "danger" = quiet until hovered or focused, then red. */
  tone?: "default" | "danger";
}

/**
 * A row action as an icon-only ghost button with its name in a tooltip — the
 * one shape every people/category table uses for edit, delete and friends.
 * Needs a `TooltipProvider` above it (each page mounts one).
 */
export const IconAction = forwardRef<HTMLButtonElement, Props>(
  ({ label, tone = "default", className, children, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          aria-label={label}
          // The tooltip repeats the name: keep the trigger from also linking
          // it as a description, or screen readers say "Edit" twice.
          aria-describedby={undefined}
          className={cn(tone === "danger" && QUIET_DANGER, className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  ),
);
IconAction.displayName = "IconAction";
