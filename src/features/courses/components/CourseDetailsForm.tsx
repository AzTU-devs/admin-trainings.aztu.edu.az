import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarDays, FileText, ImageIcon, MonitorPlay, Tags, Wallet } from "lucide-react";
import { Form } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Switch } from "@shared/components/ui/Switch";
import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
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
import { FormCard } from "@features/courses/components/FormCard";
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
  /**
   * Extra sections rendered above the submit button — the admin create screen
   * uses it for the teaching roster, which the backend takes alongside these
   * fields but which is not part of the course itself. Pass a <FormCard> so it
   * sits in the stack like the other sections.
   */
  extra?: React.ReactNode;
}

/*
 * The two uploaders sit side by side, and their empty drop zones used to be
 * different heights (a 16:9 image box beside a padded video box), leaving the
 * Media card with a ragged bottom. Both drop zones take the website's 16:10
 * cover shape instead, with their prompt centred. The uploaders only take a
 * wrapper class, so the drop zone is reached by the role react-dropzone gives
 * its root; once a video is picked its player card is not a drop zone and
 * keeps its own height.
 */
const MEDIA_BOX = cn(
  "[&_[role=presentation]]:flex [&_[role=presentation]]:aspect-[16/10] [&_[role=presentation]]:flex-col",
  "[&_[role=presentation]]:items-center [&_[role=presentation]]:justify-center",
);

export function CourseDetailsForm({ initial, editing, onSubmit, submitLabel = "Save", extra }: Props) {
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
  // Only echoed in the save bar, so the bar says which course it saves.
  const title = form.watch("title");
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
      <FormCard icon={<FileText />} title="Basics">
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
      </FormCard>

      <FormCard icon={<Tags />} title="Classification">
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
      </FormCard>

      {isOffline ? (
        <FormCard icon={<CalendarDays />} title="Offline schedule">
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
            description="How many İştirakçilər can enrol in this cohort."
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
        </FormCard>
      ) : (
        <FormCard icon={<MonitorPlay />} title="Online options">
          <FormField<CourseFormValues> name="onlineDetails.hasCertificate" label="Certificate on completion">
            {({ field }) => (
              <div className="flex h-11 items-center gap-3">
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                <span className="text-sm font-medium text-ink-2">
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
              <div className="flex h-11 items-center gap-3">
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                <span className="text-sm font-medium text-ink-2">
                  {field.value ? "Enabled" : "Disabled"}
                </span>
              </div>
            )}
          </FormField>
        </FormCard>
      )}

      <FormCard icon={<ImageIcon />} title="Media">
        <FormField<CourseFormValues> name="thumbnailMediaId" label="Cover image">
          {() => (
            <ImageUploader
              className={MEDIA_BOX}
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
              className={MEDIA_BOX}
              value={trailerMediaId ? mediaContentUrl(trailerMediaId) : null}
              uploader={trailerUploader}
              onChange={(file) => {
                if (!file) form.setValue("trailerMediaId", undefined, { shouldDirty: true });
              }}
            />
          )}
        </FormField>
      </FormCard>

      <FormCard icon={<Wallet />} title="Pricing">
        <FormField<CourseFormValues> name="free" label="Free course">
          {({ field }) => (
            <div className="flex h-11 items-center gap-3">
              <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
              <span className="text-sm font-medium text-ink-2">{isFree ? "Free" : "Paid"}</span>
            </div>
          )}
        </FormField>
        <div className="hidden md:block" aria-hidden />
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
      </FormCard>

      {extra}

      {/* A sticky save bar: it rides the bottom of the viewport while the
          form scrolls past, so a change near the top can be saved without a
          trip to the end, and settles under the last card when reached. Its
          left side names the course being saved; with nothing to name it
          shrinks to the button rather than stretching an empty bar across
          the page. At night .glass (paper, the darkest canvas) would sit
          darker than the cards it floats over and read as a hole, so the bar
          takes the raised step instead — surfaces step up at night. */}
      <div
        className={cn(
          "glass sticky bottom-3 z-20 flex items-center justify-end gap-3 rounded-[22px] py-2.5 pl-2.5 pr-2.5 shadow-[0_0_0_1px_var(--line),var(--shadow-md)] sm:bottom-5 sm:gap-4",
          "dark:bg-raised/90 dark:shadow-[0_0_0_1px_var(--raised-line),var(--shadow-md)]",
          title?.trim() ? "ml-auto w-fit sm:ml-0 sm:w-auto sm:pl-5" : "ml-auto w-fit",
        )}
      >
        {title?.trim() ? (
          <p className="mr-auto hidden min-w-0 truncate font-display text-[15px] font-bold tracking-[-0.012em] text-ink-2 sm:block">
            {title}
          </p>
        ) : null}
        <Button type="submit" loading={form.formState.isSubmitting} className="shrink-0">
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
