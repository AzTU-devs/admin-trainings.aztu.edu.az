import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Switch } from "@shared/components/ui/Switch";
import { Button } from "@shared/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { courseSchema, type CourseFormValues } from "@features/courses/schemas/course.schema";
import { COURSE_LEVEL, COURSE_TYPE } from "@shared/types/lms";
import type { CourseDto } from "@features/courses/types";
import type { NormalizedError } from "@lib/axios/httpClient";

interface Props {
  initial?: CourseDto;
  /** Hide slug on edit (backend UpdateCourseRequest has no slug). */
  editing?: boolean;
  onSubmit: (values: CourseFormValues) => Promise<unknown>;
  submitLabel?: string;
}

export function CourseDetailsForm({ initial, editing, onSubmit, submitLabel = "Save" }: Props) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      slug: initial?.slug ?? "",
      title: initial?.title ?? "",
      subtitle: initial?.subtitle ?? "",
      description: initial?.description ?? "",
      requirements: initial?.requirements ?? "",
      learningOutcomes: initial?.learningOutcomes ?? "",
      syllabus: initial?.syllabus ?? "",
      courseType: initial?.courseType ?? COURSE_TYPE.ONLINE,
      level: initial?.level ?? COURSE_LEVEL.BEGINNER,
      language: initial?.language ?? "az",
      free: initial?.free ?? false,
      price: initial?.price ?? 0,
      currency: initial?.currency ?? "AZN",
      categoryIds: initial?.categoryIds ?? [],
    },
  });

  const isFree = form.watch("free");

  const handle = async (values: CourseFormValues) => {
    try {
      await onSubmit(values);
      toast.success("Saved");
    } catch (e) {
      const err = e as NormalizedError;
      if (err.fieldErrors) {
        for (const [k, v] of Object.entries(err.fieldErrors)) {
          form.setError(k as keyof CourseFormValues, { message: v });
        }
      }
      toast.error(err.message || "Save failed");
    }
  };

  return (
    <Form form={form} onSubmit={handle}>
      <FormSection title="Basics">
        <FormField<CourseFormValues> name="title" label="Title" required>
          {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
        </FormField>
        <FormField<CourseFormValues>
          name="slug"
          label="Slug"
          required
          description={editing ? "Slug can't be changed after creation." : "Lowercase kebab-case, e.g. intro-to-se"}
        >
          {({ field, invalid }) => (
            <Input {...field} value={field.value as string} invalid={invalid} disabled={editing} />
          )}
        </FormField>
        <FormField<CourseFormValues> name="subtitle" label="Subtitle" className="md:col-span-2">
          {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
        <FormField<CourseFormValues> name="description" label="Description" className="md:col-span-2">
          {({ field, invalid }) => <Textarea rows={5} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
        <FormField<CourseFormValues> name="requirements" label="Requirements">
          {({ field, invalid }) => <Textarea rows={3} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
        <FormField<CourseFormValues> name="learningOutcomes" label="Learning outcomes">
          {({ field, invalid }) => <Textarea rows={3} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
        <FormField<CourseFormValues> name="syllabus" label="Syllabus" className="md:col-span-2">
          {({ field, invalid }) => <Textarea rows={5} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
      </FormSection>

      <FormSection title="Classification">
        <FormField<CourseFormValues> name="courseType" label="Type" required>
          {({ field, invalid }) => (
            <Select value={field.value as string} onValueChange={field.onChange}>
              <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_TYPE.ONLINE}>Online</SelectItem>
                <SelectItem value={COURSE_TYPE.OFFLINE}>Offline</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField<CourseFormValues> name="level" label="Level" required>
          {({ field, invalid }) => (
            <Select value={field.value as string} onValueChange={field.onChange}>
              <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_LEVEL.BEGINNER}>Beginner</SelectItem>
                <SelectItem value={COURSE_LEVEL.INTERMEDIATE}>Intermediate</SelectItem>
                <SelectItem value={COURSE_LEVEL.ADVANCED}>Advanced</SelectItem>
                <SelectItem value={COURSE_LEVEL.ALL}>All levels</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField<CourseFormValues> name="language" label="Language" required description="ISO code (az, en, ru…)">
          {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} maxLength={8} />}
        </FormField>
        <FormField<CourseFormValues>
          name="categoryIds"
          label="Category IDs"
          required
          description="Comma-separated category UUIDs (a real picker arrives with the category-select task)."
          className="md:col-span-2"
        >
          {({ field, invalid }) => (
            <Input
              value={(field.value as string[]).join(", ")}
              invalid={invalid}
              onChange={(e) =>
                field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
              }
              placeholder="e.g. 7c9e6679-7425-40de-944b-e07fc1f90ae7"
            />
          )}
        </FormField>
      </FormSection>

      <FormSection title="Pricing">
        <FormField<CourseFormValues> name="free" label="Free course">
          {({ field }) => (
            <div className="flex items-center gap-2 h-10">
              <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{isFree ? "Free" : "Paid"}</span>
            </div>
          )}
        </FormField>
        <div />
        <FormField<CourseFormValues> name="price" label="Price" required>
          {({ field, invalid }) => (
            <Input
              type="number"
              step="0.01"
              disabled={isFree}
              {...field}
              value={field.value as number}
              invalid={invalid}
              onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          )}
        </FormField>
        <FormField<CourseFormValues> name="currency" label="Currency" required>
          {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} maxLength={3} />}
        </FormField>
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={form.formState.isSubmitting}>{submitLabel}</Button>
      </div>
    </Form>
  );
}
