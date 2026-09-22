import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";
import { InsideTooltip, InsideTooltipProvider, useInsideTooltipProvider } from "./tooltipContext";

/** One per app (AppProviders): hovering between tooltips skips the delay. */
export function TooltipProvider({
  delayDuration = 350,
  skipDelayDuration = 250,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
  return (
    <InsideTooltipProvider.Provider value>
      <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
    </InsideTooltipProvider.Provider>
  );
}

export function Tooltip(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  return (
    <InsideTooltip.Provider value>
      <TooltipPrimitive.Root {...props} />
    </InsideTooltip.Provider>
  );
}
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Ink on paper, inverted: dark by day, pale at night.
        "z-[80] rounded-[10px] bg-ink px-2.5 py-1.5 text-xs font-medium text-paper shadow-tooltip animate-pop-in",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

/**
 * A label for an icon-only control, shown on hover and keyboard focus:
 *
 *   <Hint label="Edit"><button aria-label="Edit">…</button></Hint>
 *
 * The child must take a ref and spread props (a DOM element or a forwardRef
 * component). Works with or without a TooltipProvider above it.
 */
export function Hint({
  label,
  side = "top",
  children,
}: {
  label: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactElement;
}) {
  const inside = useInsideTooltipProvider();
  const tip = (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </TooltipPrimitive.Root>
  );
  return inside ? tip : <TooltipProvider>{tip}</TooltipProvider>;
}
