import { type LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";

type Accent = "brand" | "gold" | "success" | "warning" | "danger";

const ACCENTS: Record<Accent, string> = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  gold: "bg-aztu-gold-100 text-aztu-gold-700 dark:bg-aztu-gold-500/10 dark:text-aztu-gold-300",
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  danger: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
};

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "neutral" | "up" | "down";
  Icon: LucideIcon;
  accent?: Accent;
  /** Renders a placeholder bar in place of the value while the query is in flight. */
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, delta, deltaTone = "neutral", Icon, accent = "brand", loading, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-5", className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={cn("size-10 rounded-xl inline-flex items-center justify-center", ACCENTS[accent])}>
          <Icon className="size-5" />
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      )}
      {delta && !loading && (
        <p
          className={cn(
            "mt-1 text-xs",
            deltaTone === "up" && "text-success-600 dark:text-success-400",
            deltaTone === "down" && "text-error-600 dark:text-error-400",
            deltaTone === "neutral" && "text-gray-500 dark:text-gray-400",
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
