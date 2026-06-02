import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
        brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
        gold: "bg-aztu-gold-100 text-aztu-gold-700 dark:bg-aztu-gold-500/10 dark:text-aztu-gold-300",
        success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
        warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
        danger: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
        outline: "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
