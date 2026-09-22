import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Accept } from "react-dropzone";
import {
  CircleHelp,
  Eye,
  File,
  FileText,
  ListTree,
  Pencil,
  PlayCircle,
  Plus,
  Radio,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Badge } from "@shared/components/ui/Badge";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Spinner } from "@shared/components/ui/Spinner";
import { Label } from "@shared/components/ui/Label";
import { cn } from "@shared/lib/cn";
import { formatEnum } from "@shared/lib/enums";
import type { HueClass } from "@shared/lib/categoryStyle";
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

/** The website's curriculum icons, one per kind of lesson. */
const LESSON_ICON: Record<LessonContentType, LucideIcon> = {
  VIDEO: PlayCircle,
  TEXT: FileText,
  PDF: File,
  QUIZ: CircleHelp,
  LIVE_SESSION: Radio,
};

/** "4:05", or "1:02:05" past an hour — a duration, so it is set in mono. */
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** A lesson's kind (as the API names it) and, when it has one, its preview tag. */
function LessonTags({ lesson, className }: { lesson: LessonDto; className?: string }) {
  return (
    <span className={cn("flex shrink-0 flex-wrap items-center gap-1.5", className)}>
      {/* Sentence case, like every other enum on the dashboard (formatEnum). */}
      <Badge tone="neutral" size="sm" humanize>
        {lesson.contentType}
      </Badge>
      {lesson.preview && (
        <Badge tone="brand" size="sm">
          <Eye className="size-3" aria-hidden />
          preview
        </Badge>
      )}
    </span>
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
export function ModulesEditor({
  courseId,
  hue = "k-navy",
}: {
  courseId: UUID;
  /** The course's category hue; tints the module numbers as on the website. */
  hue?: HueClass;
}) {
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
  if (isError) return <EmptyState tone="danger" Icon={TriangleAlert} title="Could not load modules." />;

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
          Icon={ListTree}
          title="No modules yet"
          description="Add your first module to start structuring the course."
        />
      ) : (
        // The website's curriculum: one rounded card per module, its number in
        // a tile of the course's hue, lessons as hairline rows with a type icon
        // and the duration in mono — plus the editing controls.
        <ul className={cn("space-y-3", hue)}>
          {sorted.map((m) => (
            <li key={m.id} className="mod !mt-0">
              <div className="flex items-start gap-4 px-4 py-4 sm:px-5">
                {/* The module's own order index, as the API stores it (the
                    editor reorders by it), not its place in the list. */}
                <span className="num">#{m.orderIndex}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="break-words text-[16.5px] font-semibold leading-snug text-ink">{m.title}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-3">
                    {m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}
                  </p>
                  {m.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{m.description}</p>
                  )}
                </div>
                <div className="-mr-1 flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" aria-label="Edit module" onClick={() => openModuleEdit(m)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete module"
                    onClick={() => setDelModule(m)}
                    className="hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {m.lessons.length > 0 && (
                <ul>
                  {[...m.lessons]
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((l) => {
                      const Icon = LESSON_ICON[l.contentType] ?? FileText;
                      return (
                        <li key={l.id} className="lesson gap-3 py-2.5 pl-4 pr-2.5 sm:gap-3.5 sm:pl-5">
                          <span className="grid w-10 shrink-0 place-items-center text-ink-3" aria-hidden>
                            <Icon className="size-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ink">
                              <span className="mr-2 font-mono text-[12px] text-ink-3">#{l.orderIndex}</span>
                              {l.title}
                            </span>
                            {/* On a phone the tags drop under the title. */}
                            <LessonTags lesson={l} className="mt-1 sm:hidden" />
                          </span>
                          <LessonTags lesson={l} className="hidden sm:flex" />
                          <span className="du ml-2 hidden sm:block">{formatDuration(l.durationSeconds)}</span>
                          <span className="flex shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit lesson"
                              onClick={() => openLessonEdit(m, l)}
                              className="size-9"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete lesson"
                              onClick={() => setDelLesson(l)}
                              className="size-9 hover:bg-danger-tint hover:text-danger"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}

              <div className="border-t border-line px-3 py-2 sm:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-navy hover:bg-navy-tint hover:text-navy"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => openLessonCreate(m)}
                >
                  Add lesson
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Module dialog */}
      <Dialog open={moduleDialog.open} onOpenChange={(o) => setModuleDialog((s) => ({ ...s, open: o }))}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<ListTree />}>
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
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<FileText />}>
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
                      <SelectItem key={t} value={t}>{formatEnum(t)}</SelectItem>
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
