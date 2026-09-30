import { useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  FileText,
  ImageIcon,
  ListOrdered,
  MonitorPlay,
  Tags,
  Wallet,
} from "lucide-react";
import { Form } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { RichTextEditor } from "@shared/components/forms/RichTextEditor";
import { Input } from "@shared/components/ui/Input";
import { Switch } from "@shared/components/ui/Switch";
import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { isRichTextEmpty } from "@shared/lib/richText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { ImageUploader } from "@shared/components/upload/ImageUploader";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import { mediaContentUrl, uploadMediaFile } from "@shared/api/mediaApi";
import { uploadVideoFile } from "@shared/api/videoUpload";
import { env } from "@shared/config/env";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { CategoryMultiSelect } from "@features/courses/components/CategoryMultiSelect";
import { FormCard } from "@features/courses/components/FormCard";
import { SyllabusEditor } from "@features/courses/components/SyllabusEditor";
import { legacySyllabusToItems, syllabusToLegacyText } from "@features/courses/lib/syllabus";
import {
  courseSchema,
  sessionHours,
  type CourseFormValues,
} from "@features/courses/schemas/course.schema";
import { COURSE_LEVEL, COURSE_TYPE, COURSE_TYPE_LABEL } from "@shared/types/lms";
import type { CourseDto, CreateCourseRequest, UpdateCourseRequest } from "@features/courses/types";
import type { NormalizedError } from "@lib/axios/httpClient";

/**
 * What the form hands its page: the create body, plus the two removal flags an
 * edit needs (a partial update reads a missing media id as "keep it").
 */
export type CoursePayload = CreateCourseRequest &
  Pick<UpdateCourseRequest, "clearThumbnail" | "clearTrailer">;

interface Props {
  initial?: CourseDto;
  /** Hide slug on edit (backend UpdateCourseRequest has no slug). */
  editing?: boolean;
  onSubmit: (values: CoursePayload) => Promise<unknown>;
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

const TYPE_HINT: Record<CourseFormValues["courseType"], string> = {
  ONLINE: "Lessons participants take at their own pace.",
  OFFLINE: "In person, over a date range.",
  ONE_TIME: "In person, held once: one date with a start and an end time.",
};

/**
 * The form's starting values from a loaded course.
 *
 * The API sends `null` for every unset field, and the schema used to accept
 * only strings and numbers there — so an edit form opened with no trailer, or
 * an offline course with no weekly hours, failed zod's "expected string,
 * received null" on submit and never sent a request. Every nullable field is
 * normalised here, once, before it reaches the form.
 */
function toFormValues(initial?: CourseDto): CourseFormValues {
  const off = initial?.offlineDetails;
  return {
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    description: initial?.description ?? "",
    requirements: initial?.requirements ?? "",
    learningOutcomes: initial?.learningOutcomes ?? "",
    // Items when the API has them; an older course's free-text syllabus is
    // split into topics so it opens editable rather than invisible.
    syllabusItems: initial?.syllabusItems?.length
      ? initial.syllabusItems.map((i) => ({ title: i.title ?? "", description: i.description ?? "" }))
      : legacySyllabusToItems(initial?.syllabus),
    courseType: initial?.courseType ?? COURSE_TYPE.ONLINE,
    level: initial?.level ?? COURSE_LEVEL.BEGINNER,
    language: initial?.language ?? "az",
    free: initial?.free ?? false,
    price: Number(initial?.price ?? 0),
    currency: initial?.currency ?? "AZN",
    categoryIds: initial?.categoryIds ?? [],
    thumbnailMediaId: initial?.thumbnailMediaId ?? undefined,
    trailerMediaId: initial?.trailerMediaId ?? undefined,
    onlineDetails: {
      hasCertificate: initial?.onlineDetails?.hasCertificate ?? false,
      dripEnabled: initial?.onlineDetails?.dripEnabled ?? false,
    },
    offlineDetails: {
      startDate: off?.startDate ?? "",
      endDate: off?.endDate ?? "",
      // <input type="time"> takes "HH:mm"; the API may send "HH:mm:ss".
      startTime: off?.startTime?.slice(0, 5) ?? "",
      endTime: off?.endTime?.slice(0, 5) ?? "",
      weeklyHours: off?.weeklyHours ?? undefined,
      totalHours: off?.totalHours ?? undefined,
      studentLimit: off?.studentLimit ?? 20,
      city: off?.city ?? "",
      addressLine: off?.addressLine ?? "",
    },
  };
}

/** The form's values as the body the API takes. */
function toPayload(values: CourseFormValues, initial: CourseDto | undefined): CoursePayload {
  const blankToUndefined = (s: string | null | undefined) => s?.trim() || undefined;
  const text = (s: string | null | undefined) => (isRichTextEmpty(s) ? "" : (s as string));
  const off = values.offlineDetails;
  const items = values.syllabusItems.map((item) => ({
    title: item.title.trim(),
    description: isRichTextEmpty(item.description) ? undefined : item.description,
  }));

  // The backend rejects an ONLINE course that carries offline details and
  // requires them for an in-person one, so only the matching block is sent.
  let offlineDetails: CoursePayload["offlineDetails"];
  if (values.courseType === COURSE_TYPE.OFFLINE && off) {
    offlineDetails = {
      startDate: off.startDate || undefined,
      endDate: off.endDate || undefined,
      startTime: off.startTime || undefined,
      endTime: off.endTime || undefined,
      weeklyHours: off.weeklyHours ?? undefined,
      totalHours: off.totalHours ?? undefined,
      studentLimit: off.studentLimit ?? undefined,
      city: blankToUndefined(off.city),
      addressLine: blankToUndefined(off.addressLine),
    };
  } else if (values.courseType === COURSE_TYPE.ONE_TIME && off) {
    // One day: the end date is the start date, and the hours are the API's to
    // derive from the times — neither is collected.
    offlineDetails = {
      startDate: off.startDate || undefined,
      endDate: off.startDate || undefined,
      startTime: off.startTime || undefined,
      endTime: off.endTime || undefined,
      studentLimit: off.studentLimit ?? undefined,
      city: blankToUndefined(off.city),
      addressLine: blankToUndefined(off.addressLine),
    };
  }

  return {
    slug: values.slug,
    title: values.title.trim(),
    subtitle: values.subtitle?.trim() ?? "",
    description: text(values.description),
    requirements: text(values.requirements),
    learningOutcomes: text(values.learningOutcomes),
    syllabusItems: items,
    // Kept in step with the topics for readers that only know the old field
    // (see syllabusToLegacyText); it is never edited on its own.
    syllabus: syllabusToLegacyText(items),
    courseType: values.courseType,
    level: values.level,
    language: values.language,
    free: values.free,
    price: values.free ? 0 : values.price,
    currency: values.currency,
    categoryIds: values.categoryIds,
    thumbnailMediaId: values.thumbnailMediaId ?? undefined,
    trailerMediaId: values.trailerMediaId ?? undefined,
    clearThumbnail: initial?.thumbnailMediaId && !values.thumbnailMediaId ? true : undefined,
    clearTrailer: initial?.trailerMediaId && !values.trailerMediaId ? true : undefined,
    onlineDetails: values.courseType === COURSE_TYPE.ONLINE ? values.onlineDetails : undefined,
    offlineDetails,
  };
}

/** Axios reports an aborted request as a normalised ERR_CANCELED, not an AbortError. */
function isCancel(e: unknown): boolean {
  const err = e as { name?: string; code?: string };
  return err?.name === "AbortError" || err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
}

function errorMessage(e: unknown, fallback: string): string {
  const message = (e as { message?: string })?.message;
  return message && message !== "canceled" ? message : fallback;
}

/** Every message in a nested react-hook-form error tree, in field order. */
function errorMessages(errors: FieldErrors): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { message } = node as { message?: unknown };
    if (typeof message === "string" && message) out.push(message);
    for (const [key, child] of Object.entries(node)) {
      if (key !== "ref" && key !== "message" && key !== "type" && key !== "types") walk(child);
    }
  };
  walk(errors);
  return [...new Set(out)];
}

export function CourseDetailsForm({ initial, editing, onSubmit, submitLabel = "Save", extra }: Props) {
  const { isTutor, isSuperAdmin } = usePermissions();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: toFormValues(initial),
  });

  const isFree = useWatch({ control: form.control, name: "free" });
  // Only echoed in the save bar, so the bar says which course it saves.
  const title = useWatch({ control: form.control, name: "title" });
  const courseType = useWatch({ control: form.control, name: "courseType" });
  const startTime = useWatch({ control: form.control, name: "offlineDetails.startTime" });
  const endTime = useWatch({ control: form.control, name: "offlineDetails.endTime" });
  const thumbnailMediaId = useWatch({ control: form.control, name: "thumbnailMediaId" });
  const hours = sessionHours(startTime, endTime);

  /*
   * Media previews. A cover picked in this session is previewed from the local
   * file for as long as the form lives: switching the preview to the stored
   * copy the moment the upload finished downloaded the whole file straight
   * back — up to 200 MB — only to show the same picture.
   */
  const [localCover, setLocalCover] = useState<File | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const coverAbort = useRef<AbortController | null>(null);
  // The trailer uploader keeps its own local preview; it is only handed the
  // trailer the course had when the form opened, and only until it is removed.
  // Frozen at mount: following a refetched course would hand it the new id
  // after a save and make it re-download the video it has just sent.
  const [storedTrailerId] = useState(initial?.trailerMediaId ?? null);
  const [storedTrailerShown, setStoredTrailerShown] = useState(!!storedTrailerId);
  const [trailerBusy, setTrailerBusy] = useState(false);
  const uploading = coverProgress !== null || trailerBusy;

  const coverValue = localCover ?? (thumbnailMediaId ? mediaContentUrl(thumbnailMediaId) : null);
  const trailerValue = storedTrailerShown && storedTrailerId ? mediaContentUrl(storedTrailerId) : null;

  // Experts (course:create) and super admins (course:create_any) may stream a
  // video to /videos, which takes the full video ceiling. Everyone else sends
  // the trailer as multipart /media, which is sized for images and PDFs.
  const canStreamVideo = isTutor || isSuperAdmin;
  const trailerMaxMb = canStreamVideo
    ? env.uploads.maxVideoMb
    : Math.min(env.uploads.maxVideoMb, Math.max(env.uploads.maxImageMb, env.uploads.maxDocumentMb));

  const uploadCover = async (file: File) => {
    coverAbort.current?.abort();
    const controller = new AbortController();
    coverAbort.current = controller;
    setLocalCover(file);
    setCoverProgress(0);
    try {
      const media = await uploadMediaFile(file, { onProgress: setCoverProgress, signal: controller.signal });
      if (coverAbort.current !== controller) return;
      form.setValue("thumbnailMediaId", media.id, { shouldDirty: true, shouldValidate: true });
      toast.success("Cover image uploaded");
    } catch (e) {
      if (coverAbort.current !== controller || isCancel(e)) return;
      // Nothing was stored, so the pick is dropped and the previous cover (if
      // any) is what the course keeps.
      setLocalCover(null);
      toast.error(errorMessage(e, "Cover upload failed"));
    } finally {
      if (coverAbort.current === controller) {
        coverAbort.current = null;
        setCoverProgress(null);
      }
    }
  };

  const trailerUploader = async (
    file: File,
    onProgress: (pct: number) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    try {
      const id = canStreamVideo
        ? await uploadVideoFile(file, onProgress, signal)
        : (await uploadMediaFile(file, { onProgress, signal })).id;
      form.setValue("trailerMediaId", id, { shouldDirty: true, shouldValidate: true });
      return mediaContentUrl(id);
    } catch (e) {
      // VideoUploader tells a stop from a failure by the AbortError name.
      if (isCancel(e)) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
      throw new Error(errorMessage(e, "Upload failed"));
    }
  };

  const handle = async (values: CourseFormValues) => {
    if (uploading) {
      toast.error("Wait for the upload to finish, then save.");
      return;
    }
    try {
      await onSubmit(toPayload(values, initial));
      toast.success("Saved");
    } catch (e) {
      const err = e as NormalizedError;
      if (err.fieldErrors) {
        for (const [k, v] of Object.entries(err.fieldErrors)) {
          // The API names list elements `syllabusItems[0].title` and nests the
          // admin create body under `course.`; the form uses dots and no prefix.
          const path = k.replace(/^course\./, "").replace(/\[(\d+)\]/g, ".$1");
          form.setError(path as keyof CourseFormValues, { message: v });
        }
      }
      toast.error(err.message || "Save failed");
    }
  };

  const handleInvalid = (errors: FieldErrors<CourseFormValues>) => {
    const messages = errorMessages(errors);
    toast.error("Some fields need attention", {
      description: messages.slice(0, 3).join(" · ") || undefined,
    });
    // The first problem can be a screen away from the save bar.
    requestAnimationFrame(() => {
      document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <Form form={form} onSubmit={handle} onInvalidSubmit={handleInvalid}>
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
          {({ field, invalid }) => (
            <RichTextEditor
              value={field.value as string}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={invalid}
              minHeight="lg"
              ariaLabel="Description"
              placeholder="What the course is about and who it is for…"
            />
          )}
        </FormField>
        <FormField<CourseFormValues> name="requirements" label="Requirements" className="md:col-span-2">
          {({ field, invalid }) => (
            <RichTextEditor
              value={field.value as string}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={invalid}
              minHeight="sm"
              ariaLabel="Requirements"
              placeholder="What participants should know or bring…"
            />
          )}
        </FormField>
        <FormField<CourseFormValues> name="learningOutcomes" label="Learning outcomes" className="md:col-span-2">
          {({ field, invalid }) => (
            <RichTextEditor
              value={field.value as string}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={invalid}
              minHeight="sm"
              ariaLabel="Learning outcomes"
              placeholder="What participants will be able to do afterwards…"
            />
          )}
        </FormField>
      </FormCard>

      <FormCard
        icon={<ListOrdered />}
        title="Syllabus"
        description="The course outline, one topic at a time, in the order it is taught."
        grid={false}
      >
        <SyllabusEditor />
      </FormCard>

      <FormCard icon={<Tags />} title="Classification">
        <FormField<CourseFormValues>
          name="courseType"
          label="Type"
          required
          description={editing ? "Type can't be changed after creation." : TYPE_HINT[courseType]}
        >
          {({ field, invalid }) => (
            <Select value={field.value as string} onValueChange={field.onChange} disabled={editing}>
              <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_TYPE.ONLINE}>{COURSE_TYPE_LABEL.ONLINE}</SelectItem>
                <SelectItem value={COURSE_TYPE.OFFLINE}>{COURSE_TYPE_LABEL.OFFLINE}</SelectItem>
                <SelectItem value={COURSE_TYPE.ONE_TIME}>{COURSE_TYPE_LABEL.ONE_TIME}</SelectItem>
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

      {courseType === COURSE_TYPE.OFFLINE && (
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
            name="offlineDetails.startTime"
            label="Classes start at"
            description="Optional daily time."
          >
            {({ field, invalid }) => (
              <Input type="time" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <FormField<CourseFormValues> name="offlineDetails.endTime" label="Classes end at">
            {({ field, invalid }) => (
              <Input type="time" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <SeatLimitField />
          <NumberField name="offlineDetails.weeklyHours" label="Hours per week" />
          <NumberField name="offlineDetails.totalHours" label="Total hours" />
          <PlaceFields />
        </FormCard>
      )}

      {courseType === COURSE_TYPE.ONE_TIME && (
        <FormCard
          icon={<CalendarClock />}
          title="One-time session"
          description="The training happens once, on this date and between these times."
        >
          <FormField<CourseFormValues> name="offlineDetails.startDate" label="Date" required>
            {({ field, invalid }) => (
              <Input type="date" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-x-3">
            <FormField<CourseFormValues> name="offlineDetails.startTime" label="Starts at" required>
              {({ field, invalid }) => (
                <Input type="time" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
              )}
            </FormField>
            <FormField<CourseFormValues>
              name="offlineDetails.endTime"
              label="Ends at"
              required
              description={hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : undefined}
            >
              {({ field, invalid }) => (
                <Input type="time" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
              )}
            </FormField>
          </div>
          <SeatLimitField />
          <PlaceFields />
        </FormCard>
      )}

      {courseType === COURSE_TYPE.ONLINE && (
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
        <FormField<CourseFormValues>
          name="thumbnailMediaId"
          label="Cover image"
          description="Shown on the course card and at the top of its page."
        >
          {() => (
            <ImageUploader
              className={MEDIA_BOX}
              value={coverValue}
              progress={coverProgress}
              onChange={(file) => {
                if (file) {
                  void uploadCover(file);
                  return;
                }
                coverAbort.current?.abort();
                coverAbort.current = null;
                setCoverProgress(null);
                setLocalCover(null);
                form.setValue("thumbnailMediaId", undefined, { shouldDirty: true });
              }}
              aspect="video"
            />
          )}
        </FormField>
        <FormField<CourseFormValues> name="trailerMediaId" label="Trailer video">
          {() => (
            <VideoUploader
              className={MEDIA_BOX}
              value={trailerValue}
              maxSizeMb={trailerMaxMb}
              uploader={trailerUploader}
              autoStart
              onBusyChange={setTrailerBusy}
              onChange={(file) => {
                if (!file) {
                  setStoredTrailerShown(false);
                  form.setValue("trailerMediaId", undefined, { shouldDirty: true });
                }
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
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          // A save while a file is still in flight would store the course without it.
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? "Uploading…" : submitLabel}
        </Button>
      </div>
    </Form>
  );
}

/* ───────────────────── in-person fields shared by both types ───────────────────── */

function SeatLimitField() {
  return (
    <FormField<CourseFormValues>
      name="offlineDetails.studentLimit"
      label="Seat limit"
      required
      description="How many İştirakçilər can enrol."
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
  );
}

function NumberField({
  name,
  label,
}: {
  name: "offlineDetails.weeklyHours" | "offlineDetails.totalHours";
  label: string;
}) {
  return (
    <FormField<CourseFormValues> name={name} label={label}>
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
  );
}

function PlaceFields() {
  return (
    <>
      <FormField<CourseFormValues> name="offlineDetails.city" label="City">
        {({ field, invalid }) => (
          <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} maxLength={80} />
        )}
      </FormField>
      <FormField<CourseFormValues>
        name="offlineDetails.addressLine"
        label="Address"
        className="md:col-span-2"
      >
        {({ field, invalid }) => (
          <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} maxLength={255} />
        )}
      </FormField>
    </>
  );
}
