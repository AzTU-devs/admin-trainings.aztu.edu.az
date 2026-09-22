import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

/* Navy when on (periwinkle at night); off, a --control-line edge (3:1 against
   the surface, so an unchecked box in a long picker is still visible at
   night). Focus is the global 3px ring. */
export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-5 shrink-0 rounded-[7px] border-[1.5px] border-control-line bg-surface transition-colors duration-150",
      "hover:border-ink-2",
      "data-[state=checked]:border-navy data-[state=checked]:bg-navy data-[state=checked]:text-on-navy",
      "data-[state=indeterminate]:border-navy data-[state=indeterminate]:bg-navy data-[state=indeterminate]:text-on-navy",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
