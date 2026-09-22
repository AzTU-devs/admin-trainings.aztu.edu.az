import { forwardRef, isValidElement } from "react";
import { Calendar, CalendarClock, Clock, Search } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { fieldClasses, type FieldShape } from "./field";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /**
   * `search` draws the pill search box (ink-3 placeholder). Left out, a field
   * is a search box when it is `type="search"` or leads with the lucide
   * <Search> icon — every toolbar search already does, so they all match the
   * header's pill without each page opting in.
   */
  shape?: FieldShape;
}

/** Date and time fields get one icon each, in ink-3, for every browser and theme. */
const PICKER_ICON: Partial<Record<string, typeof Calendar>> = {
  date: Calendar,
  time: Clock,
  "datetime-local": CalendarClock,
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, rightSlot, shape, type, ...props }, ref) => {
    const resolved: FieldShape =
      shape ?? (type === "search" || (isValidElement(leftIcon) && leftIcon.type === Search) ? "search" : "field");
    // Chrome's own picker glyph was hidden on date and time fields (a bare
    // "--:--:--" with nothing to click) but shown on datetime-local. Now all
    // three draw a lucide icon on the right, and the native indicator is laid
    // invisibly over it (index.css, `input[data-picker]`), so clicking the
    // icon still opens the browser's picker.
    const PickerIcon = !rightSlot && type ? PICKER_ICON[type] : undefined;
    const field = cn(
      fieldClasses(invalid, resolved),
      "h-11 px-4",
      leftIcon && "pl-11",
      (rightSlot || PickerIcon) && "pr-11",
    );
    const input = (extra?: string) => (
      <input
        ref={ref}
        type={type}
        data-picker={PickerIcon ? "" : undefined}
        className={cn(field, extra)}
        {...props}
      />
    );

    // With an adornment the input is wrapped, so the caller's `className` has to
    // land on the *wrapper* — it is what participates in the parent's layout.
    // Leaving it on the input would collapse the wrapper to zero intrinsic width
    // inside a flex row and clip the placeholder.
    if (leftIcon || rightSlot || PickerIcon) {
      return (
        <div className={cn("relative w-full", className)}>
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 [&_svg]:size-4">
              {leftIcon}
            </span>
          )}
          {input()}
          {rightSlot && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
          {PickerIcon && (
            <PickerIcon
              aria-hidden
              className="picker-icon pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            />
          )}
        </div>
      );
    }

    return input(className);
  },
);
Input.displayName = "Input";
