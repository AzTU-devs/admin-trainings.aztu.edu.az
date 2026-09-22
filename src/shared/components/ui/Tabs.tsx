import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { cn } from "@shared/lib/cn";
import { mergeRefs } from "@shared/lib/mergeRefs";
import { MQ, useMediaQuery } from "@shared/lib/useMediaQuery";
import { useScrollFade } from "@shared/lib/useScrollFade";

export const Tabs = TabsPrimitive.Root;

/*
 * Tabs are the website's `.seg` control: a sunken pill track with a raised
 * pill for the current tab.
 *
 * On a phone the track stays one pill and scrolls sideways when the tabs do
 * not fit (five statuses in 358px). Wrapping made a lumpy two-row panel with
 * one tab alone under four; the earlier sideways scroll hid "Archived" with
 * nothing to say so. Now the edge with more tabs past it fades out
 * (useScrollFade), a cut-off tab peeks at that edge, the current tab is
 * scrolled into view whenever it changes, and tabs snap into place.
 * From sm the track wraps if it has to (22px radius: a pill on one row).
 */
export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, forwardedRef) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => mergeRefs(forwardedRef, ref)(node),
    [forwardedRef],
  );
  const phone = !useMediaQuery(MQ.sm, true);
  useScrollFade(ref, "x", phone);

  // Bring the current tab into view — on first paint and when it changes
  // (clicked, arrow keys, or set by the page) — scrolling only the track.
  useEffect(() => {
    const list = ref.current;
    if (!list || !phone) return;
    const reveal = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!active || list.scrollWidth <= list.clientWidth) return;
      const box = list.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const edge = 28; // clear of the fade
      if (tab.left < box.left + edge) list.scrollLeft -= box.left + edge - tab.left;
      else if (tab.right > box.right - edge) list.scrollLeft += tab.right - (box.right - edge);
    };
    reveal();
    const mo = new MutationObserver(reveal);
    mo.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    return () => mo.disconnect();
  }, [phone]);

  return (
    <TabsPrimitive.List
      ref={setRef}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-[22px] bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--line)]",
        "flex-nowrap overflow-x-auto overscroll-x-contain no-scrollbar snap-x scroll-px-1 sm:flex-wrap sm:overflow-visible",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // 12px sides on a phone: more tabs in view, and the next one peeks
      // at the faded edge instead of starting exactly past it.
      "inline-flex h-9 shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold text-ink-2 sm:px-4",
      // Inside the phone's scrolling track the usual ring (3px, 2px out)
      // would be clipped by the 4px padding; drawn flush it fits.
      "focus-visible:outline-offset-0",
      "transition-[background-color,color,box-shadow] duration-200 hover:text-ink",
      "data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_oklch(0_0_0/0.08),0_0_0_1px_var(--line)]",
      // Night: grey-on-grey measured 1.2:1, so the current tab takes the navy —
      // a navy-washed pill, navy text, a navy ring (same as `.seg`).
      "dark:data-[state=active]:bg-[color-mix(in_oklch,var(--navy)_16%,var(--surface-2))] dark:data-[state=active]:text-navy",
      "dark:data-[state=active]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--navy)_40%,transparent)]",
      "disabled:opacity-50",
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
  <TabsPrimitive.Content ref={ref} className={cn("mt-5 focus-visible:outline-offset-4", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
