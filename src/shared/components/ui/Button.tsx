import { forwardRef } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-theme-xs",
        secondary:
          "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 dark:bg-gray-dark dark:text-gray-100 dark:border-gray-700 dark:hover:bg-white/5",
        outline:
          "border border-brand-700 text-brand-700 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10",
        ghost:
          "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5",
        gold:
          "bg-aztu-gold-500 text-brand-900 hover:bg-aztu-gold-600 shadow-theme-xs",
        danger:
          "bg-error-600 text-white hover:bg-error-700 shadow-theme-xs",
        link:
          "text-brand-700 hover:underline dark:text-brand-300 px-0 py-0 rounded-none",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-10",
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
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        disabled={disabled || loading}
        {...props}
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
  },
);
Button.displayName = "Button";

export { buttonVariants };
