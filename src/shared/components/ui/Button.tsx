import { forwardRef } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Hint } from "./Tooltip";
import { useInsideTooltip } from "./tooltipContext";

/*
 * Bright buttons are pills. Primary is AzTU navy (a pale periwinkle with dark
 * text at night, so it still reads as the brand), secondary the website's
 * "ghost" (surface + hairline), ghost its "quiet". Focus is the global 3px
 * ring from index.css, which follows the pill's radius.
 *
 * Danger keeps error-600 at night too: the brighter error-500 measured 3.76:1
 * under white 14px labels (Delete, Reject, Block), below AA; 600 is 4.8:1.
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,box-shadow,translate,filter] duration-200 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0",
  {
    variants: {
      variant: {
        primary:
          "bg-navy text-on-navy shadow-[inset_0_1px_0_oklch(1_0_0/0.14),0_10px_22px_-14px_color-mix(in_oklch,var(--navy)_80%,transparent)] hover:bg-navy-hover",
        secondary:
          "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]",
        outline:
          "bg-transparent text-navy shadow-[inset_0_0_0_1.5px_color-mix(in_oklch,var(--navy)_55%,transparent)] hover:bg-navy-tint",
        ghost: "bg-transparent text-ink-2 hover:bg-ink/6 hover:text-ink",
        gold:
          "bg-gold text-on-gold shadow-[inset_0_1px_0_oklch(1_0_0/0.3),0_10px_22px_-14px_color-mix(in_oklch,var(--gold)_85%,transparent)] hover:brightness-105",
        danger:
          "bg-error-600 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.12)] hover:bg-error-700",
        link:
          "h-auto rounded-none px-0 py-0 text-navy underline-offset-4 decoration-gold decoration-2 hover:underline",
      },
      size: {
        sm: "h-10 px-4 text-[13.5px]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10 p-0",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", full: false },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /**
   * Hover/focus label. An icon-only button (`size="icon"`) with an
   * `aria-label` shows that label by default — a bare pencil or shield icon
   * was the only clue to what it did. Pass text to show something else, or
   * `false` for none.
   */
  tooltip?: React.ReactNode | false;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      full,
      asChild,
      loading,
      disabled,
      leftIcon,
      rightIcon,
      tooltip,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    // Already the trigger of a caller's <Tooltip>: that one is the label.
    const insideTooltip = useInsideTooltip();
    const label =
      tooltip === false || insideTooltip
        ? null
        : tooltip ?? (size === "icon" && typeof props["aria-label"] === "string" ? props["aria-label"] : null);
    // A tip that only repeats the button's name stays visual. Radix would
    // link it with aria-describedby, and a screen reader then said the name
    // twice ("Edit, button, Edit"); the explicit key wins over the one the
    // tooltip trigger adds.
    const quietTip = label !== null && label === props["aria-label"];
    const button = (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, full }),
          // A link-styled button keeps no pill padding, whatever its size.
          variant === "link" && "h-auto px-0",
          className,
        )}
        disabled={disabled || loading}
        {...props}
        {...(quietTip ? { "aria-describedby": props["aria-describedby"] } : {})}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : leftIcon}
        {/* With asChild, Slot must end up with exactly one element to become.
            The icons are siblings of that element here, so without Slottable
            Slot receives three children and throws "React.Children.only
            expected to receive a single React element child" — which took down
            the whole profile page. Slottable marks the element to render as and
            moves the icons inside it, around its own children. */}
        {asChild ? <Slottable>{children}</Slottable> : children}
        {!loading && rightIcon}
      </Comp>
    );
    return label ? <Hint label={label}>{button}</Hint> : button;
  },
);
Button.displayName = "Button";

export { buttonVariants };
