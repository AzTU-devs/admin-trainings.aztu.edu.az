import { Loader2 } from "lucide-react";
import { cn } from "@shared/lib/cn";

export function Spinner({ className, size = 5 }: { className?: string; size?: number }) {
  return <Loader2 className={cn("animate-spin text-brand-700 dark:text-brand-300", className)} style={{ width: size * 4, height: size * 4 }} />;
}
