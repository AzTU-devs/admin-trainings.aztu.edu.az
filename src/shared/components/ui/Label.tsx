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
      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
      className,
    )}
    {...props}
  >
    {children}
    {required && <span className="text-error-500 ml-0.5">*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
