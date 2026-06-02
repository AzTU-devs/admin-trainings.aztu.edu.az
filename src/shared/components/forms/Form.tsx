import { FormProvider, type UseFormReturn, type FieldValues } from "react-hook-form";
import { cn } from "@shared/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUseFormReturn<T extends FieldValues> = UseFormReturn<T, any, any>;

interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: AnyUseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
}

/**
 * Convenience: wraps children in <FormProvider> so any nested <FormField>
 * picks up the form context.
 *
 *   const form = useForm<MyValues>({ resolver: zodResolver(schema) });
 *   <Form form={form} onSubmit={(v) => …}>
 *     <FormField name="email" label="Email">{({field}) => <Input {...field} />}</FormField>
 *   </Form>
 */
export function Form<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...rest
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-5", className)}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <header>
          {title && <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>}
          {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </header>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
