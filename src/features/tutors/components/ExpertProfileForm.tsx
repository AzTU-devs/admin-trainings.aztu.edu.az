import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Link2, Loader2, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Button } from "@shared/components/ui/Button";
import { Badge } from "@shared/components/ui/Badge";
import { ImageUploader } from "@shared/components/upload/ImageUploader";
import { mediaContentUrl, useUploadMediaMutation } from "@shared/api/mediaApi";
import { useListCategoriesQuery } from "@features/categories/api/categoriesApi";
import { CategoryMultiSelect } from "@features/courses/components/CategoryMultiSelect";
import { FormCard } from "@features/courses/components/FormCard";
import { StickySaveBar } from "@features/profile/components/StickySaveBar";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
import {
  AREAS_REQUIRED_MESSAGE,
  EXPERT_PROFILE_FIELDS,
  OWN_AREA_LIMITS,
  expertProfileSchema,
  normalizeOwnArea,
  ownAreaProblem,
  toFormValues,
  toUpdateRequest,
  type ExpertProfileFormValues,
} from "@features/tutors/schemas/expertProfile.schema";
import type { TutorProfileDto, UpdateTutorProfileRequest } from "@features/tutors/types";
import type { NormalizedError } from "@lib/axios/httpClient";
import { cn } from "@shared/lib/cn";

interface Props {
  /** The profile as currently saved. The form edits a copy and sends only what changed. */
  profile: TutorProfileDto;
  /** Sends the partial update; resolves to the profile as saved. */
  onSave: (body: UpdateTutorProfileRequest) => Promise<TutorProfileDto>;
  onSaved?: (saved: TutorProfileDto) => void;
  onCancel?: () => void;
  submitLabel?: string;
  /**
   * Pin Cancel/Save to the bottom of the scrolling dialog, so a long profile
   * can be saved from anywhere in it. The dialog must have no bottom padding
   * (the bar supplies it).
   */
  stickyActions?: boolean;
  /**
   * `sheet` (default): the sections as one sheet split by hairlines, for the
   * admin's dialog — it is a box already. `cards`: one FormCard per section
   * and the course editor's sticky save bar, for the tutor's own page, so it
   * reads like the course editor and Settings.
   */
  layout?: "sheet" | "cards";
  /** `cards` only: what the save bar names on its left. */
  saveBarLabel?: string;
}

/** The API's refusals of a photo id — the same codes as a course cover — shown on the photo. */
const AVATAR_ERROR_CODES = new Set(["MEDIA_NOT_FOUND", "MEDIA_FORBIDDEN", "INVALID_MEDIA_FOR_FIELD"]);

type FieldName = keyof ExpertProfileFormValues;

interface TextOptions {
  placeholder?: string;
  description?: string;
  type?: string;
}

/**
 * The one expert profile editor: a tutor uses it for their own profile, an
 * admin for anyone's. Which endpoint a save goes to is the caller's `onSave`.
 */
export function ExpertProfileForm({
  profile,
  onSave,
  onSaved,
  onCancel,
  submitLabel = "Save profile",
  stickyActions,
  layout = "sheet",
  saveBarLabel,
}: Props) {
  const [uploadMedia] = useUploadMediaMutation();
  const [uploading, setUploading] = useState(false);
  // What the server holds now: the prop at first, then each save's response. A
  // second save must diff against what the first one stored, not against a
  // refetch that may not have landed yet.
  const [saved, setSaved] = useState(profile);

  const form = useForm<ExpertProfileFormValues>({
    resolver: zodResolver(expertProfileSchema),
    defaultValues: toFormValues(profile),
  });

  // The names of the categories picked above: an own area may not repeat one
  // (the API would drop it). The same cached list the picker loads.
  const { data: categories } = useListCategoriesQuery();
  const pickedIds = form.watch("expertiseCategoryIds");
  const pickedCategoryNames = useMemo(() => {
    const byId = new Map((categories ?? []).map((c) => [c.id, c.name]));
    return (pickedIds ?? []).flatMap((id) => byId.get(id) ?? []);
  }, [categories, pickedIds]);

  /**
   * Own areas changed. "At least one area" is reported under the category
   * picker, so re-check it there: adding an own area must clear that message.
   */
  const onOwnAreasChange = (next: string[], setValue: (v: string[]) => void) => {
    setValue(next);
    if (form.getFieldState("expertiseCategoryIds").error) void form.trigger("expertiseCategoryIds");
  };

  const avatarMediaId = form.watch("avatarMediaId");
  // The saved photo loads the way the rest of the dashboard shows it (see
  // tutorAvatarSrc); a fresh upload is not on any profile yet, so only the
  // authenticated route, which lets the uploader read it, can serve it.
  const avatarPreview = !avatarMediaId
    ? null
    : avatarMediaId === (saved.avatarMediaId ?? undefined)
      ? tutorAvatarSrc(saved)
      : mediaContentUrl(avatarMediaId);

  const onAvatarPicked = async (file: File | null) => {
    if (!file) {
      // Cleared in the form only; the save sends null, which removes the photo.
      form.setValue("avatarMediaId", undefined, { shouldDirty: true });
      return;
    }
    setUploading(true);
    try {
      const media = await uploadMedia(file).unwrap();
      form.setValue("avatarMediaId", media.id, { shouldDirty: true });
      form.clearErrors("avatarMediaId");
    } catch (e) {
      toast.error((e as NormalizedError).message || "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handle = async (values: ExpertProfileFormValues) => {
    const body = toUpdateRequest(values, saved);
    if (Object.keys(body).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      const next = await onSave(body);
      setSaved(next);
      form.reset(toFormValues(next));
      toast.success("Profile saved");
      onSaved?.(next);
    } catch (e) {
      const err = e as NormalizedError;
      for (const [field, message] of serverFieldErrors(err)) {
        if (EXPERT_PROFILE_FIELDS.has(field)) form.setError(field as FieldName, { message });
      }
      if (err.code && AVATAR_ERROR_CODES.has(err.code)) {
        form.setError("avatarMediaId", { message: err.message });
      }
      if (err.code === "EXPERTISE_REQUIRED") {
        form.setError("expertiseCategoryIds", { message: err.message || AREAS_REQUIRED_MESSAGE });
      }
      if (err.code === "INVALID_CUSTOM_EXPERTISE") {
        form.setError("customExpertise", { message: err.message });
      }
      toast.error(err.message || "Could not save the profile");
    }
  };

  const textInput = (name: FieldName, label: string, opts: TextOptions = {}) => (
    <FormField<ExpertProfileFormValues> name={name} label={label} description={opts.description}>
      {({ field, invalid, id }) => (
        <Input
          {...field}
          id={id}
          type={opts.type}
          value={(field.value as string) ?? ""}
          invalid={invalid}
          placeholder={opts.placeholder}
        />
      )}
    </FormField>
  );

  const textArea = (name: FieldName, label: string, rows: number, opts: TextOptions = {}) => (
    <FormField<ExpertProfileFormValues>
      name={name}
      label={label}
      description={opts.description}
      className={name === "bio" ? "md:col-span-2" : undefined}
    >
      {({ field, invalid, id }) => (
        <Textarea
          {...field}
          id={id}
          rows={rows}
          value={(field.value as string) ?? ""}
          invalid={invalid}
          placeholder={opts.placeholder}
        />
      )}
    </FormField>
  );

  const cards = layout === "cards";
  /**
   * One part of the profile: a FormCard (icon tile, display title, fields on
   * the two-column grid) on the page, a hairline-divided FormSection in the
   * dialog. Same fields either way.
   */
  const section = (icon: React.ReactNode, title: string, description: string | undefined, children: React.ReactNode) =>
    cards ? (
      <FormCard icon={icon} title={title} description={description}>
        {children}
      </FormCard>
    ) : (
      <FormSection title={title} description={description} className={SECTION}>
        {children}
      </FormSection>
    );

  const actions = (
    <>
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={form.formState.isSubmitting}
        >
          Cancel
        </Button>
      )}
      <Button type="submit" loading={form.formState.isSubmitting} disabled={uploading} className={cn(cards && "shrink-0")}>
        {submitLabel}
      </Button>
    </>
  );

  return (
    // In the dialog the sections read as one sheet with hairlines between
    // them rather than boxes inside a box; on the page each is its own card.
    <Form form={form} onSubmit={handle} className={cards ? undefined : "space-y-0"}>
      {section(
        <UserRound />,
        "Profile",
        "The photo, title line and introduction on the public expert page.",
        <>
          {/* Photo beside the title fields, as the portrait sits beside the name
              on the public page; a single column on phones. */}
          <div className="grid gap-5 md:col-span-2 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
            <FormField<ExpertProfileFormValues>
              name="avatarMediaId"
              label="Profile photo"
              description="A square head-and-shoulders photo works best."
            >
              {() => (
                <div className="space-y-2">
                  <ImageUploader
                    value={avatarPreview}
                    onChange={(file) => void onAvatarPicked(file)}
                    aspect="square"
                    disabled={uploading}
                    className="max-w-[11rem]"
                  />
                  {uploading && (
                    <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                      <Loader2 className="size-3.5 animate-spin" /> Uploading photo…
                    </p>
                  )}
                </div>
              )}
            </FormField>
            <div className="space-y-4">
              {textInput("headline", "Headline", {
                placeholder: "e.g. Data scientist and machine-learning lecturer",
                description: "One line shown under the name.",
              })}
              {textInput("academicTitle", "Academic title", {
                placeholder: "e.g. Dosent, Associate Professor",
              })}
              {textInput("department", "Department or faculty", {
                placeholder: "e.g. Faculty of Information Technology",
              })}
            </div>
          </div>
          {textArea("bio", "About", 5, {
            placeholder: "Teaching focus, research interests and industry experience.",
          })}
        </>,
      )}

      {section(
        <GraduationCap />,
        "Background",
        undefined,
        <>
          <FormField<ExpertProfileFormValues> name="yearsExperience" label="Years of experience">
            {({ field, invalid, id }) => (
              <Input
                {...field}
                id={id}
                type="number"
                min={0}
                step={1}
                value={(field.value as number | undefined) ?? ""}
                invalid={invalid}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            )}
          </FormField>
          {textInput("languages", "Languages", {
            placeholder: "e.g. Azerbaijani, English, Russian",
            description: "Separate with commas.",
          })}
          {textArea("education", "Education", 4, {
            description: "One qualification per line.",
            placeholder:
              "PhD in Computer Science, AzTU, 2015\nMSc in Software Engineering, ADA University, 2010",
          })}
          {textArea("certifications", "Certifications", 4, {
            description: "One per line.",
            placeholder: "AWS Certified Solutions Architect\nCisco CCNA",
          })}
          <FormField<ExpertProfileFormValues>
            name="expertiseCategoryIds"
            label="Areas of expertise"
            description="Pick from the list, add your own below, or both."
            required
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
          <FormField<ExpertProfileFormValues>
            name="customExpertise"
            label="Add your own area"
            className="md:col-span-2"
          >
            {({ field, invalid, id }) => (
              <OwnAreasField
                id={id}
                value={(field.value as string[]) ?? []}
                onChange={(next) => onOwnAreasChange(next, field.onChange)}
                invalid={invalid}
                pickedCategoryNames={pickedCategoryNames}
              />
            )}
          </FormField>
        </>,
      )}

      {section(
        <Link2 />,
        "Links",
        "Full addresses starting with https://. Leave a field blank to hide that link.",
        <>
          {textInput("websiteUrl", "Personal website", { type: "url", placeholder: "https://…" })}
          {textInput("linkedinUrl", "LinkedIn", {
            type: "url",
            placeholder: "https://www.linkedin.com/in/…",
          })}
          {textInput("googleScholarUrl", "Google Scholar", {
            type: "url",
            placeholder: "https://scholar.google.com/citations?user=…",
          })}
          {textInput("researchGateUrl", "ResearchGate", {
            type: "url",
            placeholder: "https://www.researchgate.net/profile/…",
          })}
          {textInput("orcid", "ORCID iD", {
            placeholder: "0000-0000-0000-0000",
            description: "The 16-digit iD; a pasted orcid.org link works too.",
          })}
          {textInput("githubUrl", "GitHub", { type: "url", placeholder: "https://github.com/…" })}
        </>,
      )}

      {cards ? (
        <StickySaveBar label={saveBarLabel}>{actions}</StickySaveBar>
      ) : (
        <div
          className={cn(
            "flex gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end",
            // Frosted bar pinned to the dialog's bottom edge (surface-toned, so it
            // reads as part of the white sheet); the negative margins match
            // DialogContent's padding so the hairline runs edge to edge. On a
            // phone the two buttons share one row — stacked, the bar would take
            // a sixth of the screen from the form it scrolls over.
            stickyActions
              ? "sticky bottom-0 z-10 -mx-6 flex-row bg-surface/88 px-6 pb-5 backdrop-blur-md sm:-mx-7 sm:px-7 sm:pb-6 [&>button]:flex-1 sm:[&>button]:flex-none"
              : "flex-col-reverse",
          )}
        >
          {actions}
        </div>
      )}
    </Form>
  );
}

/** One section of the sheet: hairline above every section but the first. */
const SECTION = "border-t border-line py-7 first:border-t-0 first:pt-0";

interface OwnAreasFieldProps {
  /** The text box's id, so the field's label names it. */
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid: boolean;
  /** Names of the categories picked above, which an own area may not repeat. */
  pickedCategoryNames: string[];
}

/**
 * The expert's own areas, for when the category list lacks theirs: a text box
 * with an Add button (Enter adds too, without submitting the whole profile),
 * and what was added as removable chips — outlined, so they read as the
 * expert's own words beside the category picker's coloured chips. The API's
 * limits are checked as each one is added.
 */
function OwnAreasField({ id, value, onChange, invalid, pickedCategoryNames }: OwnAreasFieldProps) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const full = value.length >= OWN_AREA_LIMITS.count;
  const hintId = `${id}-hint`;

  const add = () => {
    const issue = ownAreaProblem(draft, value, pickedCategoryNames);
    if (issue) {
      setProblem(issue);
      return;
    }
    onChange([...value, normalizeOwnArea(draft)]);
    setDraft("");
    setProblem(null);
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul aria-label="Your own areas" className="flex flex-wrap gap-1.5">
          {value.map((area, i) => (
            <li key={`${i}-${area}`}>
              <Badge tone="outline" className="h-7 gap-1 pl-2.5 pr-1">
                <span className="max-w-[14rem] truncate">{area}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove ${area}`}
                  className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-ink/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (problem) setProblem(null);
          }}
          onKeyDown={(e) => {
            // Enter adds the area; left alone, it would submit the whole profile.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={full ? "Remove one to add another" : "e.g. Computer vision"}
          disabled={full}
          invalid={invalid || !!problem}
          aria-describedby={hintId}
          aria-invalid={invalid || !!problem || undefined}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          leftIcon={<Plus className="size-4" />}
          onClick={add}
          disabled={full || !draft.trim()}
          className="shrink-0"
        >
          Add
        </Button>
      </div>
      <p
        id={hintId}
        aria-live="polite"
        className={cn("text-[12.5px] leading-snug", problem ? "font-medium text-danger" : "text-ink-3")}
      >
        {problem ??
          `Not in the list? Add up to ${OWN_AREA_LIMITS.count} of your own, ${OWN_AREA_LIMITS.minLength}–${OWN_AREA_LIMITS.maxLength} characters each (${value.length}/${OWN_AREA_LIMITS.count}).`}
      </p>
    </div>
  );
}

/**
 * Per-field messages from a failed save. The API's validation body lists them
 * as `errors: [{ field, message }]`, which the HTTP client passes through as
 * `fieldErrors` unchanged; a `{ field: message }` map is accepted too.
 */
function serverFieldErrors(err: NormalizedError): Array<[string, string]> {
  const raw: unknown = err.fieldErrors;
  if (Array.isArray(raw)) {
    return raw.flatMap((item: unknown): Array<[string, string]> => {
      const { field, message } = (item ?? {}) as { field?: unknown; message?: unknown };
      return typeof field === "string" && typeof message === "string" ? [[field, message]] : [];
    });
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
  }
  return [];
}
