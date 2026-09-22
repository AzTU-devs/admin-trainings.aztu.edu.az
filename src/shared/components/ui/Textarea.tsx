import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";
import { fieldClasses } from "./field";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldClasses(invalid), "resize-y rounded-[16px] px-4 py-3 leading-relaxed", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
