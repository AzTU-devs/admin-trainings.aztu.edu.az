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
import { ImageUploader } from "@shared/components/upload/ImageUploader";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import { useUploadMediaMutation, mediaContentUrl } from "@shared/api/mediaApi";
import { CategoryMultiSelect } from "@features/courses/components/CategoryMultiSelect";
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
  const [uploadMedia] = useUploadMediaMutation();

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
      thumbnailMediaId: initial?.thumbnailMediaId,
      trailerMediaId: initial?.trailerMediaId,
      onlineDetails: {
        hasCertificate: initial?.onlineDetails?.hasCertificate ?? false,
        dripEnabled: initial?.onlineDetails?.dripEnabled ?? false,
      },
      offlineDetails: {
        startDate: initial?.offlineDetails?.startDate ?? "",
        endDate: initial?.offlineDetails?.endDate ?? "",
        weeklyHours: initial?.offlineDetails?.weeklyHours,
        totalHours: initial?.offlineDetails?.totalHours,
        studentLimit: initial?.offlineDetails?.studentLimit ?? 20,
        city: initial?.offlineDetails?.city ?? "",
        addressLine: initial?.offlineDetails?.addressLine ?? "",
      },
    },
  });

  const isFree = form.watch("free");
  const courseType = form.watch("courseType");
  const isOffline = courseType === COURSE_TYPE.OFFLINE;
  const thumbnailMediaId = form.watch("thumbnailMediaId");
  const trailerMediaId = form.watch("trailerMediaId");

  const uploadAnd = async (file: File, field: "thumbnailMediaId" | "trailerMediaId") => {
    try {
      const media = await uploadMedia(file).unwrap();
      form.setValue(field, media.id, { shouldDirty: true });
      toast.success("Uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  // VideoUploader expects an uploader that returns a URL; reuse the media upload.
  const trailerUploader = async (file: File): Promise<string> => {
    const media = await uploadMedia(file).unwrap();
    form.setValue("trailerMediaId", media.id, { shouldDirty: true });
    return mediaContentUrl(media.id);
  };

  const handle = async (values: CourseFormValues) => {
    // The backend rejects an ONLINE course that carries offline details and
    // requires them for an OFFLINE one, so only the matching block is sent.
    // Blank optional strings are dropped rather than posted as "".
    const offline = values.offlineDetails;
    const payload: CourseFormValues = {
      ...values,
      onlineDetails: values.courseType === COURSE_TYPE.ONLINE ? values.onlineDetails : undefined,
      offlineDetails:
        values.courseType === COURSE_TYPE.OFFLINE && offline
          ? {
              ...offline,
              city: offline.city?.trim() || undefined,
              addressLine: offline.addressLine?.trim() || undefined,
            }
          : undefined,
    };

    try {
      await onSubmit(payload);
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
        <FormField<CourseFormValues>
          name="courseType"
          label="Type"
          required
          description={editing ? "Type can't be changed after creation." : undefined}
        >
          {({ field, invalid }) => (
            <Select value={field.value as string} onValueChange={field.onChange} disabled={editing}>
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
          label="Categories"
          required
          description="Pick one or more categories."
          className="md:col-span-2"
        >
          {({ field, invalid }) => (
            <CategoryMultiSelect
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              invalid={invalid}
            />
          )}
        </FormField>
      </FormSection>

      {isOffline ? (
        <FormSection title="Offline schedule">
          <FormField<CourseFormValues> name="offlineDetails.startDate" label="Start date" required>
            {({ field, invalid }) => (
              <Input type="date" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <FormField<CourseFormValues> name="offlineDetails.endDate" label="End date" required>
            {({ field, invalid }) => (
              <Input type="date" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <FormField<CourseFormValues>
            name="offlineDetails.studentLimit"
            label="Seat limit"
            required
            description="How many students can enrol in this cohort."
          >
            {({ field, invalid }) => (
              <Input
                type="number"
                min={1}
                {...field}
                value={(field.value as number) ?? ""}
                invalid={invalid}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            )}
          </FormField>
          <FormField<CourseFormValues> name="offlineDetails.weeklyHours" label="Hours per week">
            {({ field, invalid }) => (
              <Input
                type="number"
                step="0.5"
                min={0}
                {...field}
                value={(field.value as number) ?? ""}
                invalid={invalid}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            )}
          </FormField>
          <FormField<CourseFormValues> name="offlineDetails.totalHours" label="Total hours">
            {({ field, invalid }) => (
              <Input
                type="number"
                step="0.5"
                min={0}
                {...field}
                value={(field.value as number) ?? ""}
                invalid={invalid}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            )}
          </FormField>
          <FormField<CourseFormValues> name="offlineDetails.city" label="City">
            {({ field, invalid }) => (
              <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <FormField<CourseFormValues>
            name="offlineDetails.addressLine"
            label="Address"
            className="md:col-span-2"
          >
            {({ field, invalid }) => (
              <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
        </FormSection>
      ) : (
        <FormSection title="Online options">
          <FormField<CourseFormValues> name="onlineDetails.hasCertificate" label="Certificate on completion">
            {({ field }) => (
              <div className="flex h-10 items-center gap-2">
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {field.value ? "Issued" : "Not issued"}
                </span>
              </div>
            )}
          </FormField>
          <FormField<CourseFormValues>
            name="onlineDetails.dripEnabled"
            label="Drip content"
            description="Release lessons on a schedule instead of all at once."
          >
            {({ field }) => (
              <div className="flex h-10 items-center gap-2">
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {field.value ? "Enabled" : "Disabled"}
                </span>
              </div>
            )}
          </FormField>
        </FormSection>
      )}

      <FormSection title="Media">
        <FormField<CourseFormValues> name="thumbnailMediaId" label="Cover image">
          {() => (
            <ImageUploader
              value={thumbnailMediaId ? mediaContentUrl(thumbnailMediaId) : null}
              onChange={(file) => {
                if (file) void uploadAnd(file, "thumbnailMediaId");
                else form.setValue("thumbnailMediaId", undefined, { shouldDirty: true });
              }}
              aspect="video"
            />
          )}
        </FormField>
        <FormField<CourseFormValues> name="trailerMediaId" label="Trailer video">
          {() => (
            <VideoUploader
              value={trailerMediaId ? mediaContentUrl(trailerMediaId) : null}
              uploader={trailerUploader}
              onChange={(file) => {
                if (!file) form.setValue("trailerMediaId", undefined, { shouldDirty: true });
              }}
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
