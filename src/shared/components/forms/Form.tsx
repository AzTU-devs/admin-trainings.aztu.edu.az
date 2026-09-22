import { useRef } from "react";
import { toast } from "sonner";
import {
  FormProvider,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "@shared/lib/cn";
import { flattenFieldErrors } from "./formErrors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUseFormReturn<T extends FieldValues> = UseFormReturn<T, any, any>;

interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onInvalid"> {
  form: AnyUseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
  /** Called after the built-in feedback when client-side validation fails. */
  onInvalid?: (errors: FieldErrors<TFieldValues>) => void;
}

/**
 * Convenience: wraps children in <FormProvider> so any nested <FormField>
 * picks up the form context.
 *
 *   const form = useForm<MyValues>({ resolver: zodResolver(schema) });
 *   <Form form={form} onSubmit={(v) => …}>
 *     <FormField name="email" label="Email">{({field}) => <Input {...field} />}</FormField>
 *   </Form>
 *
 * A submit that fails validation is never silent. It used to be: handleSubmit
 * had no invalid handler, so the only feedback was a red line under the failing
 * field — which may be far below the fold (the course form's media section), or
 * not rendered at all (the user dialog's hidden password field). The owner's
 * "Update course does nothing" was exactly this. Now a failed submit toasts the
 * first reason and scrolls the first failing field into view.
 */
export function Form<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  onInvalid,
  children,
  className,
  ...rest
}: FormProps<TFieldValues>) {
  const ref = useRef<HTMLFormElement>(null);

  const handleInvalid = (errors: FieldErrors<TFieldValues>) => {
    const [first] = flattenFieldErrors(errors);
    toast.error("Please fix the highlighted fields", {
      description: first?.message,
    });
    onInvalid?.(errors);
    // After the re-render that paints the error messages.
    window.setTimeout(() => {
      const msg = ref.current?.querySelector<HTMLElement>("[data-field-error]");
      if (!msg) return;
      msg.scrollIntoView?.({ block: "center", behavior: "smooth" });
      const field = msg.closest("[data-form-field]");
      const focusable = field?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])",
      );
      focusable?.focus({ preventScroll: true });
    }, 50);
  };

  return (
    <FormProvider {...form}>
      <form
        ref={ref}
        noValidate
        onSubmit={form.handleSubmit(onSubmit, handleInvalid)}
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
