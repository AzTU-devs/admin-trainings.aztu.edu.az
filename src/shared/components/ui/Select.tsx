import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, useContext } from "react";
import { FieldIdContext } from "@shared/components/forms/fieldIdContext";
import { cn } from "@shared/lib/cn";

type SelectProps = Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "value"> & {
  /** null / undefined / "" all mean "nothing chosen" (the placeholder shows). */
  value?: string | null;
};

/**
 * Radix's Select root with two traps closed, for every select in the app.
 *
 * 1. Controlled for life. Passing `value` at all makes the select controlled,
 *    and an empty value is sent to Radix as "" rather than undefined. The
 *    `value={x || undefined}` pattern flipped Radix between uncontrolled and
 *    controlled (React warns both ways), and once uncontrolled it kept showing
 *    the last pick after the form was reset.
 * 2. No phantom "". Inside a <form> Radix mirrors the value into a hidden
 *    native <select> and reports that element's change events. When the value
 *    arrives before its <option> is registered (a saved setting loaded after
 *    mount), the native element reads "" and Radix reports "" as a user
 *    choice, which wiped the saved locale on /settings. No item may have the
 *    value "" (Radix throws), so "" is never a real choice and is dropped.
 */
export function Select({ onValueChange, ...props }: SelectProps) {
  const controlled = "value" in props;
  return (
    <SelectPrimitive.Root
      {...props}
      value={controlled ? (props.value ?? "") : undefined}
      onValueChange={
        onValueChange &&
        ((v) => {
          if (v !== "") onValueChange(v);
        })
      }
    />
  );
}
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { invalid?: boolean }
>(({ className, invalid, children, id, ...props }, ref) => {
  // Inside a FormField, take the id its label points at (see FieldIdContext).
  const fieldId = useContext(FieldIdContext);
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      id={id ?? fieldId}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border bg-white dark:bg-gray-dark px-3.5 text-sm",
        "text-gray-900 dark:text-white",
        "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-shadow",
        "data-[placeholder]:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed",
        invalid ? "border-error-300" : "border-gray-200 dark:border-gray-700",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 text-gray-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
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
        "z-[60] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-lg p-1.5",
        "min-w-[var(--radix-select-trigger-width)] max-h-[var(--radix-select-content-available-height)]",
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
      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-sm outline-none",
      "focus:bg-brand-50 dark:focus:bg-brand-500/10 focus:text-brand-700 dark:focus:text-brand-300",
      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 inline-flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-brand-700 dark:text-brand-300" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-gray-100 dark:bg-gray-800", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";
