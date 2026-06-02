import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-5 shrink-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-dark",
      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20",
      "data-[state=checked]:bg-brand-700 data-[state=checked]:border-brand-700 data-[state=checked]:text-white",
      "data-[state=indeterminate]:bg-brand-700 data-[state=indeterminate]:border-brand-700 data-[state=indeterminate]:text-white",
      "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? <Minus className="size-3.5" /> : <Check className="size-3.5" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
