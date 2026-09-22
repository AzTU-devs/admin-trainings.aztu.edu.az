import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    // max-w-full + overflow-x-auto: a status strip wider than a phone (the
    // course lists have six tabs, 448px in a 358px column) used to be clipped,
    // with "Archived" unreachable — the shell clips horizontal overflow, so it
    // could not be scrolled to either. Now the strip scrolls within itself.
    className={cn(
      "inline-flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-gray-100 dark:bg-white/5 p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
      "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
      "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-dark data-[state=active]:text-brand-700 dark:data-[state=active]:text-white data-[state=active]:shadow-theme-xs",
      "transition-colors disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  // `data-[state=inactive]:hidden` only matters with `forceMount`: Radix
  // unmounts inactive panels by default, which throws away a form's unsaved
  // input when the user glances at another tab. A force-mounted panel stays in
  // the tree and is merely hidden.
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 data-[state=inactive]:hidden", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
