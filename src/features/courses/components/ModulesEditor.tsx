import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Accept } from "react-dropzone";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { Label } from "@shared/components/ui/Label";
import { FileDropzone } from "@shared/components/forms/FileDropzone";
import { VideoUploader } from "@shared/components/upload/VideoUploader";
import {
  ANY_MEDIA_ACCEPT,
  DOCUMENT_ACCEPT,
  DOCUMENT_FORMATS_LABEL,
  MULTIPART_MAX_MB,
  VIDEO_ACCEPT,
  VIDEO_FORMATS_LABEL,
  validateAnyMediaFile,
  validateDocumentFile,
  validateVideoFile,
} from "@shared/components/upload/uploadConstraints";
import { env, resolveApiUrl } from "@shared/config/env";
import { toastApiError } from "@shared/lib/apiError";
import type { LessonContentType } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";
import { useStreamingVideoUpload } from "@features/videos/hooks/useStreamingVideoUpload";
import { useCanStreamVideo } from "@features/videos/hooks/useCanStreamVideo";
import { VideoLibraryPicker } from "@features/videos/components/VideoLibraryPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Form } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { LESSON_CONTENT_TYPE, type UUID } from "@shared/types/lms";
import type { LessonDto, ModuleDto } from "@features/courses/types";
import { moduleSchema, type ModuleFormValues } from "@features/courses/schemas/module.schema";
import { lessonSchema, type LessonFormValues } from "@features/courses/schemas/lesson.schema";
import {
  useAddLessonMutation,
  useAddModuleMutation,
  useDeleteLessonMutation,
  useDeleteModuleMutation,
  useListModulesQuery,
  useUpdateLessonMutation,
  useUpdateModuleMutation,
} from "@features/courses/api/modulesApi";

/**
 * What a new lesson can be. QUIZ and LIVE_SESSION exist in the API's enum, but
 * there are no quiz tables or endpoints and no time or link fields for a session,
 * so offering them created lessons no learner could take. An existing lesson of
 * either type still shows — and keeps — its type.
 */
const NEW_LESSON_TYPES: LessonContentType[] = [
  LESSON_CONTENT_TYPE.VIDEO,
  LESSON_CONTENT_TYPE.TEXT,
  LESSON_CONTENT_TYPE.PDF,
];

/**
 * Restrict the dropzone to the types the API will actually store for this lesson.
 *
 * `video/*` and an open picker were both wider than the server: the API accepts
 * only MP4/WebM/MOV, only PDF for documents, and never SVG or anything
 * executable. A picker that offers more does not upload more — it just moves the
 * refusal to after the transfer. See uploadConstraints.
 */
function acceptFor(contentType: LessonContentType): Accept {
  if (contentType === "PDF") return DOCUMENT_ACCEPT;
  if (contentType === "VIDEO") return VIDEO_ACCEPT;
  return ANY_MEDIA_ACCEPT;
}

/**
 * Attachments other than a VIDEO lesson's video go through multipart
 * `POST /api/media`, which the API caps at 32 MB — so a video attached there is
 * held to that cap, not to the streaming limit, and the hint says so. (It used to
 * promise 512 MB for every kind, and every real recording failed with a 413.)
 */
const multipartVideoMb = Math.min(env.uploads.maxVideoMb, MULTIPART_MAX_MB);
const multipartLimits = {
  maxImageMb: Math.min(env.uploads.maxImageMb, MULTIPART_MAX_MB),
  maxVideoMb: multipartVideoMb,
  maxDocumentMb: Math.min(env.uploads.maxDocumentMb, MULTIPART_MAX_MB),
};

function hintFor(contentType: LessonContentType): string {
  if (contentType === "PDF") return `${DOCUMENT_FORMATS_LABEL} document, up to ${multipartLimits.maxDocumentMb} MB`;
  if (contentType === "VIDEO") return `${VIDEO_FORMATS_LABEL}, up to ${multipartVideoMb} MB from this account`;
  return (
    `Image up to ${multipartLimits.maxImageMb} MB, ` +
    `PDF up to ${multipartLimits.maxDocumentMb} MB, ` +
    `or a short video up to ${multipartVideoMb} MB`
  );
}

function validateFor(contentType: LessonContentType) {
  return (file: File) =>
    contentType === "PDF"
      ? validateDocumentFile(file, multipartLimits.maxDocumentMb)
      : contentType === "VIDEO"
        ? validateVideoFile(file, multipartVideoMb)
        : validateAnyMediaFile(file, multipartLimits);
}

type ModuleDialogState = { open: boolean; editing: ModuleDto | null };
type LessonDialogState = { open: boolean; moduleId: UUID; lessonCount: number; editing: LessonDto | null };

/**
 * Interactive module & lesson editor for a course. Reads the content tree from
 * `GET /portal/courses/{courseId}/modules` and mutates via the `/portal`
 * module/lesson endpoints (see modulesApi). Mutations invalidate the cached
 * tree so the list stays in sync.
 */
export function ModulesEditor({ courseId }: { courseId: UUID }) {
  const { data: modules, isLoading, isError, error, refetch } = useListModulesQuery(courseId);

  const [addModule] = useAddModuleMutation();
  const [updateModule] = useUpdateModuleMutation();
  const [deleteModule] = useDeleteModuleMutation();
  const [addLesson] = useAddLessonMutation();
  const [updateLesson] = useUpdateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();

  const streamUpload = useStreamingVideoUpload();
  // Without the streaming video endpoints a VIDEO lesson falls back to multipart,
  // held to its 30 MB cap (and without the library, which lives there too).
  const canStreamVideo = useCanStreamVideo();
  /** Title of the attached video when known (a pick or an upload), for the attached row. */
  const [materialLabel, setMaterialLabel] = useState<string | null>(null);

  const [moduleDialog, setModuleDialog] = useState<ModuleDialogState>({ open: false, editing: null });
  const [lessonDialog, setLessonDialog] = useState<LessonDialogState | null>(null);
  const [delModule, setDelModule] = useState<ModuleDto | null>(null);
  const [delLesson, setDelLesson] = useState<LessonDto | null>(null);

  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: "", description: "" },
  });
  const emptyLesson: LessonFormValues = {
    title: "",
    description: "",
    contentType: "VIDEO",
    videoMediaId: undefined,
    videoUrl: "",
    durationSeconds: 0,
    preview: false,
  };
  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: emptyLesson,
  });

  const openModuleCreate = () => {
    moduleForm.reset({ title: "", description: "" });
    setModuleDialog({ open: true, editing: null });
  };
  const openModuleEdit = (m: ModuleDto) => {
    moduleForm.reset({ title: m.title, description: m.description ?? "" });
    setModuleDialog({ open: true, editing: m });
  };
  const openLessonCreate = (m: ModuleDto) => {
    lessonForm.reset(emptyLesson);
    setMaterialLabel(null);
    setLessonDialog({ open: true, moduleId: m.id, lessonCount: m.lessons.length, editing: null });
  };
  const openLessonEdit = (m: ModuleDto, l: LessonDto) => {
    lessonForm.reset({
      title: l.title,
      description: l.description ?? "",
      contentType: l.contentType,
      videoMediaId: l.videoMediaId ?? undefined,
      // Loaded so it survives the save: the PUT replaces the whole lesson.
      videoUrl: l.videoUrl ?? "",
      durationSeconds: l.durationSeconds,
      preview: l.preview,
    });
    setMaterialLabel(null);
    setLessonDialog({ open: true, moduleId: m.id, lessonCount: m.lessons.length, editing: l });
  };

  /** VIDEO lessons stream their video; VideoUploader wants a URL back. */
  const lessonVideoUploader = async (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => {
    const asset = await streamUpload(file, onProgress, signal);
    lessonForm.setValue("videoMediaId", asset.id, { shouldValidate: true, shouldDirty: true });
    setMaterialLabel(asset.title);
    // Seed the duration when the API measured one and the tutor has not typed one.
    if (asset.durationSeconds > 0 && !lessonForm.getValues("durationSeconds")) {
      lessonForm.setValue("durationSeconds", asset.durationSeconds);
    }
    return resolveApiUrl(asset.url);
  };

  const submitModule = async (values: ModuleFormValues) => {
    const editing = moduleDialog.editing;
    const orderIndex = editing ? editing.orderIndex : (modules?.length ?? 0);
    try {
      if (editing) {
        await updateModule({ courseId, moduleId: editing.id, body: { ...values, orderIndex } }).unwrap();
      } else {
        await addModule({ courseId, body: { ...values, orderIndex } }).unwrap();
      }
      toast.success(editing ? "Module updated" : "Module added");
      setModuleDialog({ open: false, editing: null });
    } catch (e) {
      toastApiError(e, "Could not save the module", moduleForm);
    }
  };

  const submitLesson = async (values: LessonFormValues) => {
    if (!lessonDialog) return;
    const { editing, moduleId, lessonCount } = lessonDialog;
    const orderIndex = editing ? editing.orderIndex : lessonCount;
    // null, not undefined, for an emptied link: the PUT is a full replacement and
    // null is how the API is told to clear it.
    const body = { ...values, videoUrl: values.videoUrl?.trim() || null, orderIndex };
    try {
      if (editing) {
        await updateLesson({ courseId, lessonId: editing.id, body }).unwrap();
      } else {
        await addLesson({ courseId, moduleId, body }).unwrap();
      }
      toast.success(editing ? "Lesson updated" : "Lesson added");
      setLessonDialog(null);
    } catch (e) {
      toastApiError(e, "Could not save the lesson", lessonForm);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (isError) return <QueryErrorState error={error} onRetry={refetch} what="the modules" />;

  const sorted = [...(modules ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button leftIcon={<Plus className="size-4" />} onClick={openModuleCreate}>
          Add module
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No modules yet"
          description="Add your first module to start structuring the course."
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((m) => (
            <li key={m.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">#{m.orderIndex}</span>
                <p className="font-medium text-gray-900 dark:text-white">{m.title}</p>
                <span className="text-xs text-gray-500 ml-auto">
                  {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
                </span>
                <Button variant="ghost" size="icon" aria-label="Edit module" onClick={() => openModuleEdit(m)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete module" onClick={() => setDelModule(m)}>
                  <Trash2 className="size-4 text-error-500" />
                </Button>
              </div>
              {m.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{m.description}</p>}

              <ul className="mt-3 space-y-1.5">
                {[...m.lessons]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((l) => (
                    <li key={l.id} className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2">
                      <span className="text-xs font-mono text-gray-400">#{l.orderIndex}</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{l.title}</span>
                      <Badge tone="neutral">{enumLabel("lessonContentType", l.contentType)}</Badge>
                      {l.preview && <Badge tone="success">preview</Badge>}
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit lesson" onClick={() => openLessonEdit(m, l)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete lesson" onClick={() => setDelLesson(l)}>
                          <Trash2 className="size-4 text-error-500" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>

              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                leftIcon={<Plus className="size-4" />}
                onClick={() => openLessonCreate(m)}
              >
                Add lesson
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Module dialog */}
      <Dialog open={moduleDialog.open} onOpenChange={(o) => setModuleDialog((s) => ({ ...s, open: o }))}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{moduleDialog.editing ? "Edit module" : "Add module"}</DialogTitle>
            <DialogDescription className="sr-only">A module groups the lessons of one part of the course.</DialogDescription>
          </DialogHeader>
          <Form form={moduleForm} onSubmit={submitModule}>
            <FormField<ModuleFormValues> name="title" label="Title" required>
              {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
            </FormField>
            <FormField<ModuleFormValues> name="description" label="Description">
              {({ field, invalid }) => <Textarea {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
            </FormField>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setModuleDialog({ open: false, editing: null })}>
                Cancel
              </Button>
              <Button type="submit" loading={moduleForm.formState.isSubmitting}>
                {moduleDialog.editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      <Dialog open={!!lessonDialog} onOpenChange={(o) => !o && setLessonDialog(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{lessonDialog?.editing ? "Edit lesson" : "Add lesson"}</DialogTitle>
            <DialogDescription className="sr-only">The lesson's title, type, material and link.</DialogDescription>
          </DialogHeader>
          <Form form={lessonForm} onSubmit={submitLesson}>
            <FormField<LessonFormValues> name="title" label="Title" required>
              {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
            </FormField>
            <FormField<LessonFormValues> name="contentType" label="Content type" required>
              {({ field, invalid }) => {
                // Keep an existing QUIZ / LIVE_SESSION lesson's own type selectable.
                const current = lessonDialog?.editing?.contentType;
                const types =
                  current && !NEW_LESSON_TYPES.includes(current) ? [...NEW_LESSON_TYPES, current] : NEW_LESSON_TYPES;
                return (
                  <Select
                    value={field.value as string}
                    onValueChange={(v) => {
                      // Material uploaded for another type (a PDF on a lesson now
                      // marked VIDEO) would be refused by the API on save.
                      if (v !== field.value && lessonForm.getValues("videoMediaId")) {
                        lessonForm.setValue("videoMediaId", undefined);
                        setMaterialLabel(null);
                      }
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger invalid={invalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>{enumLabel("lessonContentType", t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            </FormField>
            <div data-form-field>
              <Label>Material</Label>
              <div className="mt-1.5 space-y-2">
                {lessonForm.watch("videoMediaId") ? (
                  // Removing it is truthful here: the lesson PUT is a full
                  // replacement, so an absent id clears the stored one.
                  <FileDropzone
                    current={materialLabel ?? (lessonForm.watch("contentType") === "VIDEO" ? "Video attached" : "File attached")}
                    onUploaded={() => undefined}
                    onClear={() => {
                      lessonForm.setValue("videoMediaId", undefined, { shouldValidate: true });
                      setMaterialLabel(null);
                    }}
                  />
                ) : lessonForm.watch("contentType") === "VIDEO" && canStreamVideo ? (
                  <>
                    <VideoUploader uploader={lessonVideoUploader} />
                    <VideoLibraryPicker
                      onSelect={(v) => {
                        lessonForm.setValue("videoMediaId", v.id, { shouldValidate: true, shouldDirty: true });
                        setMaterialLabel(v.title);
                        if (v.durationSeconds > 0 && !lessonForm.getValues("durationSeconds")) {
                          lessonForm.setValue("durationSeconds", v.durationSeconds);
                        }
                      }}
                    />
                  </>
                ) : (
                  <FileDropzone
                    accept={acceptFor(lessonForm.watch("contentType"))}
                    hint={hintFor(lessonForm.watch("contentType"))}
                    validate={validateFor(lessonForm.watch("contentType"))}
                    onUploaded={(m) => {
                      lessonForm.setValue("videoMediaId", m.id, { shouldValidate: true });
                      setMaterialLabel(null);
                    }}
                  />
                )}
              </div>
            </div>
            <FormField<LessonFormValues>
              name="videoUrl"
              label="Link (meeting or external video)"
              description="Optional. A full https:// address, e.g. a meeting room or a hosted video."
            >
              {({ field, invalid }) => (
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  {...field}
                  value={(field.value as string) ?? ""}
                  invalid={invalid}
                  maxLength={512}
                />
              )}
            </FormField>
            <FormField<LessonFormValues> name="durationSeconds" label="Duration (seconds)">
              {({ field, invalid }) => (
                <Input
                  type="number"
                  min={0}
                  invalid={invalid}
                  value={Number.isFinite(field.value as number) ? (field.value as number) : 0}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              )}
            </FormField>
            <FormField<LessonFormValues> name="description" label="Description">
              {({ field, invalid }) => <Textarea {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
            </FormField>
            <div>
              <Label>Preview</Label>
              <label className="mt-1 inline-flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={lessonForm.watch("preview")}
                  onCheckedChange={(c) => lessonForm.setValue("preview", !!c, { shouldValidate: true })}
                />
                <span>Free preview lesson</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setLessonDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={lessonForm.formState.isSubmitting}>
                {lessonDialog?.editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={delModule !== null}
        onOpenChange={(o) => !o && setDelModule(null)}
        title="Delete module?"
        description="The module and all its lessons will be removed."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!delModule) return;
          await deleteModule({ courseId, moduleId: delModule.id }).unwrap();
          toast.success("Module deleted");
        }}
      />

      <ConfirmDialog
        open={delLesson !== null}
        onOpenChange={(o) => !o && setDelLesson(null)}
        title="Delete lesson?"
        description="This lesson will be removed."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!delLesson) return;
          // A failure is reported by ConfirmDialog, which keeps the dialog open.
          await deleteLesson({ courseId, lessonId: delLesson.id }).unwrap();
          toast.success("Lesson deleted");
        }}
      />
    </div>
  );
}
