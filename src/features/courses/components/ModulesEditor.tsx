import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Accept } from "react-dropzone";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { Label } from "@shared/components/ui/Label";
import { FileDropzone } from "@shared/components/forms/FileDropzone";
import {
  ANY_MEDIA_ACCEPT,
  DOCUMENT_ACCEPT,
  DOCUMENT_FORMATS_LABEL,
  VIDEO_ACCEPT,
  VIDEO_FORMATS_LABEL,
} from "@shared/components/upload/uploadConstraints";
import { env } from "@shared/config/env";
import type { LessonContentType } from "@shared/types/lms";
import {
  Dialog,
  DialogContent,
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

const CONTENT_TYPES = Object.values(LESSON_CONTENT_TYPE);

/**
 * Restrict the dropzone to the types the API will actually store for this lesson.
 *
 * `video/*` and an open picker were both wider than the server: the API accepts
 * only MP4/WebM/MOV, only PDF for documents, and never SVG or anything
 * executable. A picker that offers more does not upload more — it just moves the
 * refusal to after the transfer. See uploadConstraints.
 */
function acceptFor(contentType: LessonContentType): Accept {
  switch (contentType) {
    case "VIDEO":
      return VIDEO_ACCEPT;
    case "PDF":
      return DOCUMENT_ACCEPT;
    default:
      return ANY_MEDIA_ACCEPT; // TEXT / QUIZ / LIVE_SESSION — any storable attachment
  }
}

/**
 * Per-kind size caps, read from config rather than written in prose: the hint used
 * to promise "up to 100MB" for every kind, which matched no limit on either side
 * (the real ceilings are 512 MB video, 25 MB PDF, 10 MB image).
 */
const ACCEPT_HINT: Record<LessonContentType, string> = {
  VIDEO: `${VIDEO_FORMATS_LABEL}, up to ${env.uploads.maxVideoMb} MB`,
  PDF: `${DOCUMENT_FORMATS_LABEL} document, up to ${env.uploads.maxDocumentMb} MB`,
  TEXT: anyMediaHint(),
  QUIZ: anyMediaHint(),
  LIVE_SESSION: anyMediaHint(),
};

function anyMediaHint(): string {
  return (
    `Image up to ${env.uploads.maxImageMb} MB, ` +
    `PDF up to ${env.uploads.maxDocumentMb} MB, ` +
    `or video up to ${env.uploads.maxVideoMb} MB`
  );
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
  const { data: modules, isLoading, isError } = useListModulesQuery(courseId);

  const [addModule] = useAddModuleMutation();
  const [updateModule] = useUpdateModuleMutation();
  const [deleteModule] = useDeleteModuleMutation();
  const [addLesson] = useAddLessonMutation();
  const [updateLesson] = useUpdateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();

  const [moduleDialog, setModuleDialog] = useState<ModuleDialogState>({ open: false, editing: null });
  const [lessonDialog, setLessonDialog] = useState<LessonDialogState | null>(null);
  const [delModule, setDelModule] = useState<ModuleDto | null>(null);
  const [delLesson, setDelLesson] = useState<LessonDto | null>(null);

  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: "", description: "" },
  });
  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", description: "", contentType: "VIDEO", videoMediaId: undefined, durationSeconds: 0, preview: false },
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
    lessonForm.reset({ title: "", description: "", contentType: "VIDEO", videoMediaId: undefined, durationSeconds: 0, preview: false });
    setLessonDialog({ open: true, moduleId: m.id, lessonCount: m.lessons.length, editing: null });
  };
  const openLessonEdit = (m: ModuleDto, l: LessonDto) => {
    lessonForm.reset({
      title: l.title,
      description: l.description ?? "",
      contentType: l.contentType,
      videoMediaId: l.videoMediaId ?? undefined,
      durationSeconds: l.durationSeconds,
      preview: l.preview,
    });
    setLessonDialog({ open: true, moduleId: m.id, lessonCount: m.lessons.length, editing: l });
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
    } catch {
      toast.error("Could not save module");
    }
  };

  const submitLesson = async (values: LessonFormValues) => {
    if (!lessonDialog) return;
    const { editing, moduleId, lessonCount } = lessonDialog;
    const orderIndex = editing ? editing.orderIndex : lessonCount;
    const body = { ...values, orderIndex };
    try {
      if (editing) {
        await updateLesson({ courseId, lessonId: editing.id, body }).unwrap();
      } else {
        await addLesson({ courseId, moduleId, body }).unwrap();
      }
      toast.success(editing ? "Lesson updated" : "Lesson added");
      setLessonDialog(null);
    } catch {
      toast.error("Could not save lesson");
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (isError) return <p className="text-sm text-error-600">Could not load modules.</p>;

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
                      <Badge tone="neutral">{l.contentType}</Badge>
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
          </DialogHeader>
          <Form form={lessonForm} onSubmit={submitLesson}>
            <FormField<LessonFormValues> name="title" label="Title" required>
              {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
            </FormField>
            <FormField<LessonFormValues> name="contentType" label="Content type" required>
              {({ field, invalid }) => (
                <Select value={field.value as string} onValueChange={field.onChange}>
                  <SelectTrigger invalid={invalid}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <div>
              <Label>Material</Label>
              <div className="mt-1.5">
                <FileDropzone
                  accept={acceptFor(lessonForm.watch("contentType"))}
                  hint={ACCEPT_HINT[lessonForm.watch("contentType")]}
                  current={lessonForm.watch("videoMediaId") ? "File attached" : null}
                  onUploaded={(m) => lessonForm.setValue("videoMediaId", m.id, { shouldValidate: true })}
                  onClear={() => lessonForm.setValue("videoMediaId", undefined, { shouldValidate: true })}
                />
              </div>
            </div>
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
          try {
            await deleteModule({ courseId, moduleId: delModule.id }).unwrap();
            toast.success("Module deleted");
          } catch {
            toast.error("Could not delete module");
          }
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
          try {
            await deleteLesson({ courseId, lessonId: delLesson.id }).unwrap();
            toast.success("Lesson deleted");
          } catch {
            toast.error("Could not delete lesson");
          }
        }}
      />
    </div>
  );
}
