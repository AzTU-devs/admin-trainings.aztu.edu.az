import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
      // Off is a --control-line track (3:1 against the surface), not the
      // decorative line-2, so an off switch is still a visible control.
      "data-[state=checked]:bg-navy data-[state=unchecked]:bg-control-line",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_3px_oklch(0.235_0.045_258/0.25)] transition-transform duration-200 ease-out",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // At night the checked track is pale periwinkle, so the knob goes dark.
        "dark:data-[state=checked]:bg-on-navy",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
