import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";
import { fieldClasses } from "./field";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      fieldClasses(invalid),
      "flex h-11 items-center justify-between gap-2 px-4 text-left data-[placeholder]:text-ink-4",
      "data-[state=open]:border-focus data-[state=open]:ring-[3px] data-[state=open]:ring-focus/25",
      "[&>span]:truncate",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 text-ink-3" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        // --raised: one step lighter than the cards at night, where the shadow
        // barely shows on the navy canvas.
        "z-[60] overflow-hidden rounded-[18px] border border-raised-line bg-raised p-1.5 text-ink shadow-[var(--shadow-lg)] animate-pop-in",
        "min-w-[var(--radix-select-trigger-width)] max-h-[var(--radix-select-content-available-height)]",
        // At least the trigger's width, at most what is left of the screen: a
        // long option ("SMOKE-verify-roomstatus RETIRED · SMOKE-vrs-R…") grew
        // the panel past a phone's right edge and cut the room code, which is
        // what tells the options apart. Options wrap inside instead.
        "max-w-[min(var(--radix-select-content-available-width),calc(100vw-24px))]",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-10 w-full cursor-pointer select-none items-center rounded-[12px] py-2 pl-9 pr-3 text-sm text-ink-2 outline-none",
      "focus:bg-navy-tint focus:text-navy data-[state=checked]:font-semibold data-[state=checked]:text-ink",
      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    <span className="absolute left-3 inline-flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-navy" strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <span className="min-w-0 break-words">
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1.5 h-px bg-line", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";
