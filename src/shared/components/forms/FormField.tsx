import {
  Controller,
  useFormContext,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@shared/lib/cn";
import { Label } from "@shared/components/ui/Label";

interface FormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  /** Render prop: receives the controller field + helpers (e.g. invalid). */
  children: (args: {
    field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
    invalid: boolean;
    id: string;
  }) => React.ReactNode;
}

/**
 * Standardised label + control + error layout backed by react-hook-form.
 * Use inside a <FormProvider> (see `<Form>` wrapper).
 */
export function FormField<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children,
}: FormFieldProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();
  const id = `field-${name}`;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {/* The message comes from `fieldState`, not `formState.errors[name]`:
          the latter is a flat lookup and misses dotted paths such as
          `offlineDetails.startDate`, so nested errors never reached the UI. */}
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          const error = fieldState.error?.message;
          return (
            <>
              {children({ field, invalid: !!fieldState.error, id })}
              {description && !error && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
              )}
              {error && (
                <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
