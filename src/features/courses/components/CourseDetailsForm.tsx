import { useRef, useState } from "react";
import { useForm, type FieldNamesMarkedBoolean } from "react-hook-form";
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
import { MULTIPART_MAX_MB } from "@shared/components/upload/uploadConstraints";
import { useUploadMediaMutation, mediaContentUrl } from "@shared/api/mediaApi";
import { env, resolveApiUrl } from "@shared/config/env";
import { apiErrorMessage, toastApiError } from "@shared/lib/apiError";
import { CategoryMultiSelect } from "@features/courses/components/CategoryMultiSelect";
import { courseSchema, type CourseFormValues } from "@features/courses/schemas/course.schema";
import { COURSE_LEVEL, COURSE_TYPE } from "@shared/types/lms";
import type { CourseDto, UpdateCourseRequest } from "@features/courses/types";
import { useStreamingVideoUpload } from "@features/videos/hooks/useStreamingVideoUpload";
import { useCanStreamVideo } from "@features/videos/hooks/useCanStreamVideo";
import { VideoLibraryPicker } from "@features/videos/components/VideoLibraryPicker";

interface Props {
  initial?: CourseDto;
  /** Hide slug on edit (backend UpdateCourseRequest has no slug). */
  editing?: boolean;
  /**
   * `values` is the whole validated form, for a create. `update` is what an edit
   * sends: only the fields the user touched, any media removal, and the version
   * the form was loaded at. Two people editing the same course (an admin and its
   * tutor, say) no longer overwrite each other: disjoint changes both survive,
   * and a save based on a stale copy is refused with 409 STALE_RESOURCE.
   * Resolve with the saved course so the next save carries its new version.
   */
  onSubmit: (values: CourseFormValues, update: UpdateCourseRequest) => Promise<CourseDto | unknown>;
  /** The server reported someone else's newer edit (409 STALE_RESOURCE): reload. */
  onStale?: () => void;
  submitLabel?: string;
  /**
   * Extra sections rendered above the submit button — the admin create screen
   * uses it for the teaching roster, which the backend takes alongside these
   * fields but which is not part of the course itself.
   */
  extra?: React.ReactNode;
}

/** True when a dirty-fields node (boolean, object or array of them) holds any change. */
function anyDirty(node: unknown): boolean {
  if (node === true) return true;
  if (Array.isArray(node)) return node.some(anyDirty);
  if (node && typeof node === "object") return Object.values(node).some(anyDirty);
  return false;
}

/**
 * The admin endpoints nest the course under `course` (AdminCreateCourseRequest),
 * so their field errors arrive as `course.title`; the form's field is `title`.
 */
const courseField = (apiField: string) => apiField.replace(/^course\./, "");

export function CourseDetailsForm({ initial, editing, onSubmit, onStale, submitLabel = "Save", extra }: Props) {
  const [uploadMedia] = useUploadMediaMutation();
  const streamUpload = useStreamingVideoUpload();
  // Video larger than the multipart cap can only go through the streaming video
  // endpoints; anyone who may not use them falls back to multipart, capped honestly.
  const canStreamVideo = useCanStreamVideo();
  // An API that versions courses also accepts clearThumbnail / clearTrailer.
  // Against an older one a removal cannot be saved, so it is not offered there.
  const canClearMedia = typeof initial?.version === "number";
  /** The version this form's content is based on: the loaded course, then each of our own saves. */
  const version = useRef<number | undefined>(initial?.version);
  const trailerMaxMb = canStreamVideo ? env.uploads.maxVideoMb : MULTIPART_MAX_MB;
  const [trailerLabel, setTrailerLabel] = useState<string | undefined>(undefined);

  /**
   * The media ids the server currently holds. Removing a saved cover or trailer
   * is sent as an explicit clear flag — an absent id means "keep", so the X used
   * to say "Saved" and remove nothing. Against an API without the flags the X
   * on saved media is hidden instead, and removing a fresh upload falls back to
   * these ids rather than to "no media", which the server would still be showing.
   */
  const saved = useRef({
    thumbnailMediaId: initial?.thumbnailMediaId ?? undefined,
    trailerMediaId: initial?.trailerMediaId ?? undefined,
  });

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    // Every nullable field is normalised here. The API sends an unset column as
    // an explicit JSON null, and zod's `.optional()` accepts undefined, not null:
    // copying `thumbnailMediaId: null` or `weeklyHours: null` straight in failed
    // validation on submit, so "Update course" did nothing for any course without
    // both a cover and a trailer (36 of 38 on the dev database).
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
      // Omitted means "keep" to the API, so undefined is also the right thing to send.
      thumbnailMediaId: initial?.thumbnailMediaId ?? undefined,
      trailerMediaId: initial?.trailerMediaId ?? undefined,
      onlineDetails: {
        hasCertificate: initial?.onlineDetails?.hasCertificate ?? false,
        dripEnabled: initial?.onlineDetails?.dripEnabled ?? false,
      },
      offlineDetails: {
        startDate: initial?.offlineDetails?.startDate ?? "",
        endDate: initial?.offlineDetails?.endDate ?? "",
        weeklyHours: initial?.offlineDetails?.weeklyHours ?? undefined,
        totalHours: initial?.offlineDetails?.totalHours ?? undefined,
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
    } catch (e) {
      toast.error(apiErrorMessage(e, "Upload failed"));
    }
  };

  /**
   * Streams the trailer through the video endpoints (no 32 MB multipart cap) for
   * anyone allowed to; otherwise uploads it as multipart within that cap.
   * VideoUploader wants a URL back; the form wants the media id.
   */
  const trailerUploader = async (
    file: File,
    onProgress: (pct: number) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    if (canStreamVideo) {
      const asset = await streamUpload(file, onProgress, signal);
      form.setValue("trailerMediaId", asset.id, { shouldDirty: true });
      setTrailerLabel(asset.title);
      return resolveApiUrl(asset.url);
    }
    try {
      const media = await uploadMedia(file).unwrap();
      form.setValue("trailerMediaId", media.id, { shouldDirty: true });
      setTrailerLabel(undefined);
      return mediaContentUrl(media.id);
    } catch (e) {
      // VideoUploader shows `Error.message`; keep the API's reason in it.
      throw new Error(apiErrorMessage(e, "Upload failed"));
    }
  };

  /** Remove the cover or trailer (or, where that cannot be saved, go back to the saved one). */
  const clearMedia = (field: "thumbnailMediaId" | "trailerMediaId") => {
    form.setValue(field, editing && !canClearMedia ? saved.current[field] : undefined, { shouldDirty: true });
    if (field === "trailerMediaId") setTrailerLabel(undefined);
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

    // Only what the user changed, for an edit. A nested block (the offline
    // schedule) goes whole when any part of it changed: the API merges it.
    // Slug and type are fixed after creation, so never part of an edit.
    const dirty = form.formState.dirtyFields as FieldNamesMarkedBoolean<CourseFormValues>;
    const update: UpdateCourseRequest = {};
    for (const key of Object.keys(payload) as (keyof CourseFormValues)[]) {
      if (key === "slug" || key === "courseType") continue;
      if (anyDirty(dirty[key])) (update as Record<string, unknown>)[key] = payload[key];
    }
    if (canClearMedia) {
      if (saved.current.thumbnailMediaId && !values.thumbnailMediaId) update.clearThumbnail = true;
      if (saved.current.trailerMediaId && !values.trailerMediaId) update.clearTrailer = true;
    }
    if (editing && Object.keys(update).length === 0) {
      toast.info("No changes to save");
      return;
    }
    if (editing && version.current !== undefined) update.version = version.current;

    try {
      const result = await onSubmit(payload, update);
      toast.success("Saved");
      if (editing) {
        const next = (result as Partial<CourseDto> | undefined)?.version;
        if (typeof next === "number") version.current = next;
        saved.current = {
          thumbnailMediaId: values.thumbnailMediaId,
          trailerMediaId: values.trailerMediaId,
        };
        // What was just saved becomes the baseline, so the next save sends only
        // what changes after this one.
        form.reset(values);
      }
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code === "STALE_RESOURCE") {
        // Saving anyway would overwrite their work; reloading shows it and
        // starts this form again from the current course.
        toast.error("Someone else changed this course while you were editing.", {
          description: "Reload to see their changes, then make yours again.",
          duration: 15_000,
          action: onStale ? { label: "Reload", onClick: onStale } : undefined,
        });
        return;
      }
      toastApiError(e, "Save failed", form, { mapField: courseField });
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
        </FormSection>
      ) : (
        <FormSection title="Online options">
          {/* The platform stores this flag but nothing issues a certificate yet,
              so it is labelled as the plan it is rather than as "Issued". The
              field stays so existing courses keep what they were set to. */}
          <FormField<CourseFormValues>
            name="onlineDetails.hasCertificate"
            label="Certificate on completion (coming soon)"
            description="Certificates are not issued yet."
          >
            {({ field }) => (
              <div className="flex h-10 items-center gap-2">
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {field.value ? "Planned" : "Not planned"}
                </span>
              </div>
            )}
          </FormField>
          {/* Nothing reads the drip flag: every lesson is released at once. A
              working-looking switch for it was a promise the platform can't keep. */}
          <FormField<CourseFormValues>
            name="onlineDetails.dripEnabled"
            label="Drip content"
            description="Coming soon — for now all lessons are available as soon as someone enrols."
          >
            {({ field }) => (
              <div className="flex h-10 items-center gap-2">
                <Switch checked={field.value as boolean} disabled aria-readonly />
                <span className="text-sm text-gray-500 dark:text-gray-400">Coming soon</span>
              </div>
            )}
          </FormField>
        </FormSection>
      )}

      <FormSection title="Media">
        <FormField<CourseFormValues>
          name="thumbnailMediaId"
          label="Cover image"
          description={thumbnailMediaId ? "Click the image to replace it." : undefined}
        >
          {() => (
            <ImageUploader
              value={thumbnailMediaId ? mediaContentUrl(thumbnailMediaId) : null}
              onChange={(file) => {
                if (file) void uploadAnd(file, "thumbnailMediaId");
                else clearMedia("thumbnailMediaId");
              }}
              removable={!editing || canClearMedia || thumbnailMediaId !== saved.current.thumbnailMediaId}
              aspect="video"
            />
          )}
        </FormField>
        <FormField<CourseFormValues>
          name="trailerMediaId"
          label="Trailer video"
          description={
            canStreamVideo ? undefined : `Up to ${MULTIPART_MAX_MB} MB from this account.`
          }
        >
          {() => (
            <div className="space-y-2">
              <VideoUploader
                value={trailerMediaId ? mediaContentUrl(trailerMediaId) : null}
                uploader={trailerUploader}
                maxSizeMb={trailerMaxMb}
                storedLabel={trailerLabel}
                noun="trailer"
                removable={!editing || canClearMedia || trailerMediaId !== saved.current.trailerMediaId}
                onChange={(file) => {
                  if (!file) clearMedia("trailerMediaId");
                }}
              />
              {canStreamVideo && (
                <VideoLibraryPicker
                  onSelect={(v) => {
                    form.setValue("trailerMediaId", v.id, { shouldDirty: true });
                    setTrailerLabel(v.title);
                  }}
                />
              )}
            </div>
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

      {extra}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={form.formState.isSubmitting}>{submitLabel}</Button>
      </div>
    </Form>
  );
}
