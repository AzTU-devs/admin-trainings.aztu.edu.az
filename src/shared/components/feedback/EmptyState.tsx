import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";

interface Props {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, Icon = Inbox, action, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 py-12 px-6 text-center",
        className,
      )}
    >
      <div className="mx-auto size-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
