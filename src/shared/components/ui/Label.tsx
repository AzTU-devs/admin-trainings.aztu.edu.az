import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "mb-1.5 block text-[13.5px] font-semibold text-ink",
      className,
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-0.5 text-danger">*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
