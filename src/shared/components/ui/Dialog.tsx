import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, useCallback, useRef, useState } from "react";
import { cn } from "@shared/lib/cn";
import { mergeRefs } from "@shared/lib/mergeRefs";
import { useScrollFade } from "@shared/lib/useScrollFade";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    // No blur: a confirm such as "Delete user?" does not name the row, and
    // the row (or the list an edit dialog is checked against) has to stay
    // readable behind the scrim.
    className={cn("fixed inset-0 z-50 bg-scrim data-[state=open]:animate-fade-in", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/** Tabbable elements, for the first-focus choice below. */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The first thing a person would tab to inside `root`, never the close button. */
function firstTabbable(root: HTMLElement): HTMLElement | null {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(TABBABLE))) {
    if (el.tabIndex < 0 || el.closest("[data-dialog-close], [aria-hidden='true'], [inert]")) continue;
    if (el.getClientRects().length === 0) continue; // not rendered
    return el;
  }
  return null;
}

/**
 * The dialog panel. Taller than the screen (a long form on a phone), it
 * scrolls inside — and then the header (title, close button) stays pinned at
 * the top and the DialogFooter (the actions) at the bottom, each with a
 * hairline that shows only while there is more past it. Before, the whole
 * panel scrolled as one: on a phone "New room" opened with Create 200px below
 * the fold, and once scrolled there was no visible way to close it.
 *
 * `--dlg-pad` is the panel's padding (24px, 28px from sm); the pinned header
 * and footer bleed through it with matching negative margins.
 *
 * First focus: the first field or button in the dialog, as Radix does — but
 * never the close button. A detail dialog with nothing else to focus now
 * focuses the panel itself, instead of opening with a 3px ring around its X.
 */
export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: "sm" | "md" | "lg" | "xl";
    showClose?: boolean;
  }
>(({ className, size = "md", showClose = true, children, onOpenAutoFocus, ...props }, forwardedRef) => {
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  const contentRef = useRef<HTMLDivElement | null>(null);
  // The panel only exists while open, so the scroll watcher gets the node
  // itself (state), not a ref object read once at mount.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      mergeRefs(forwardedRef, contentRef)(el);
      setNode(el);
    },
    [forwardedRef],
  );
  useScrollFade(node, "y", { attribute: "data-scroll" });

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setRef}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          const root = contentRef.current;
          if (!root) return;
          const target = firstTabbable(root);
          if (!target) return root.focus({ preventScroll: true });
          target.focus({ preventScroll: true });
          if (target instanceof HTMLInputElement) target.select();
        }}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
          widths[size],
          // Taller than the screen scrolls inside rather than running off both edges.
          "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain",
          "[--dlg-pad:1.5rem] sm:[--dlg-pad:1.75rem]",
          "rounded-[28px] border border-line bg-surface p-[var(--dlg-pad)] text-ink shadow-[var(--shadow-lg)]",
          "focus:outline-none data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      >
        {/* First in the DOM so it can stay pinned (a zero-height sticky rail
            at the top); the first-focus rule above skips it. */}
        {showClose && (
          <div className="pointer-events-none sticky top-0 z-20 h-0">
            <DialogPrimitive.Close
              data-dialog-close=""
              aria-label="Close"
              className="pointer-events-auto absolute -right-2 -top-2 inline-flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-ink/6 hover:text-ink"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

const HEADER_TILE = {
  brand: "bg-navy-tint text-navy",
  danger: "bg-danger-tint text-danger",
  warning: "bg-warn-tint text-warn",
} as const;

/**
 * Title (and description) block — one layout for every dialog: an optional
 * 44px icon tile on the left, the Albert Sans 20px title, the description
 * under it in ink-2. Give create/edit dialogs the page's nav icon (Tags,
 * DoorOpen, UserPlus, CalendarPlus …) and a destructive or blocking action
 * `iconTone="danger"`:
 *
 *   <DialogHeader icon={<DoorOpen />}><DialogTitle>New room</DialogTitle></DialogHeader>
 *   <DialogHeader icon={<Ban />} iconTone="danger"><DialogTitle>Block IP address</DialogTitle></DialogHeader>
 *
 * Pinned to the top of a dialog that scrolls (see DialogContent): it bleeds
 * through the panel's padding on a surface fill, and its bottom hairline
 * shows once the body has scrolled under it (index.css, `[data-scroll]`).
 */
export function DialogHeader({
  className,
  icon,
  iconTone = "brand",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  iconTone?: keyof typeof HEADER_TILE;
}) {
  const pinned = cn(
    "sticky top-[calc(-1*var(--dlg-pad,0px))] z-10 bg-surface",
    // pb-3 + mb-2: the same 20px to the body as before it was pinned, 12px of it inside the bar.
    "-mx-[var(--dlg-pad,0px)] -mt-[var(--dlg-pad,0px)] mb-2 px-[var(--dlg-pad,0px)] pb-3 pt-[var(--dlg-pad,0px)]",
    // Clear of the close button.
    "pr-[calc(var(--dlg-pad,0px)+2.25rem)]",
  );
  if (!icon) {
    return (
      <div data-dialog-header="" className={cn(pinned, "flex flex-col gap-1.5", className)} {...props}>
        {children}
      </div>
    );
  }
  return (
    <div data-dialog-header="" className={cn(pinned, "flex items-start gap-4", className)} {...props}>
      <span
        aria-hidden
        className={cn("grid size-11 shrink-0 place-items-center rounded-[14px] [&_svg]:size-5", HEADER_TILE[iconTone])}
      >
        {icon}
      </span>
      <div className="flex min-h-11 min-w-0 flex-col justify-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * The action row. Pinned to the bottom of a dialog that scrolls, on a
 * translucent surface with a hairline and a soft shadow while fields are
 * hidden under it — so Create / Save is always on screen. Keep it the last
 * thing in the dialog (inside the <Form> is fine).
 */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-dialog-footer=""
      className={cn(
        "sticky bottom-[calc(-1*var(--dlg-pad,0px))] z-10 bg-surface/95 backdrop-blur-md",
        // mt-4 + pt-3: ~28px above the buttons, as before, 12px of it inside the bar.
        "-mx-[var(--dlg-pad,0px)] -mb-[var(--dlg-pad,0px)] mt-4 px-[var(--dlg-pad,0px)] pb-[var(--dlg-pad,0px)] pt-3",
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-xl font-bold leading-tight tracking-[-0.018em] text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-ink-2", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
