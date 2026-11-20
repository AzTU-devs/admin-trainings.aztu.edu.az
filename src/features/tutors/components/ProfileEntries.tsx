import { useId, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useFieldArray, useFormContext, useFormState, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "@shared/components/forms/FormField";
import { Button } from "@shared/components/ui/Button";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import {
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  ENTRY_LIMITS,
  latestEndYear,
  type ExpertProfileFormValues,
} from "@features/tutors/schemas/expertProfile.schema";

type Values = ExpertProfileFormValues;
type ListName = "educationEntries" | "experienceEntries";
type Kind = "education" | "experience";

/*
 * The expert's education and experience as lists of entries, inside the
 * profile form: they are saved with it, each list sent whole in the order
 * shown (entries are added at the end; there is no reordering). The checks
 * are the API's (see expertProfile.schema).
 */

interface EducationProps {
  /**
   * Show the free-text education from before the lists. Only for a profile
   * that still has some: the public page shows it until the first entry is
   * added, and here it can be moved over and cleared.
   */
  legacy?: boolean;
}

export function EducationEntriesField({ legacy }: EducationProps) {
  const { control } = useFormContext<Values>();
  const { fields, append, remove } = useFieldArray({ control, name: "educationEntries" });
  const addRef = useRef<HTMLButtonElement>(null);

  return (
    <EntryList
      name="educationEntries"
      count={fields.length}
      addRef={addRef}
      addLabel="Add education"
      empty="No education added yet."
      onAdd={() =>
        append({ ...EMPTY_EDUCATION }, { focusName: `educationEntries.${fields.length}.institution` })
      }
      after={
        legacy && (
          <FormField<Values>
            name="education"
            label="Earlier education notes"
            description={
              fields.length === 0
                ? "The public page shows these lines until an entry is added above. Move each into an entry, then clear this box."
                : "No longer shown publicly: the entries above take their place. Clear this box once everything is moved over."
            }
          >
            {({ field, invalid, id }) => (
              <Textarea {...field} id={id} rows={3} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
        )
      }
    >
      {fields.map((f, i) => (
        <EntryCard
          key={f.id}
          title={`Education ${i + 1}`}
          onRemove={() => removeEntry(remove, i, addRef)}
        >
          <TextField
            name={`educationEntries.${i}.institution`}
            label="Institution"
            required
            placeholder="e.g. Azerbaijan Technical University"
          />
          <TextField name={`educationEntries.${i}.degree`} label="Degree" placeholder="e.g. PhD in Computer Science" />
          <YearFields list="educationEntries" index={i} kind="education" />
        </EntryCard>
      ))}
    </EntryList>
  );
}

export function ExperienceEntriesField() {
  const { control } = useFormContext<Values>();
  const { fields, append, remove } = useFieldArray({ control, name: "experienceEntries" });
  const addRef = useRef<HTMLButtonElement>(null);

  return (
    <EntryList
      name="experienceEntries"
      count={fields.length}
      addRef={addRef}
      addLabel="Add experience"
      empty="No experience added yet."
      onAdd={() => append({ ...EMPTY_EXPERIENCE }, { focusName: `experienceEntries.${fields.length}.company` })}
    >
      {fields.map((f, i) => (
        <EntryCard
          key={f.id}
          title={`Experience ${i + 1}`}
          onRemove={() => removeEntry(remove, i, addRef)}
        >
          <TextField
            name={`experienceEntries.${i}.company`}
            label="Company or organisation"
            required
            placeholder="e.g. Azercell"
          />
          <TextField
            name={`experienceEntries.${i}.position`}
            label="Position"
            required
            placeholder="e.g. Senior data engineer"
          />
          <YearFields list="experienceEntries" index={i} kind="experience" />
          <FormField<Values>
            name={`experienceEntries.${i}.description`}
            label="Description"
            description="What the role involved, in a few lines. Plain text."
            className="md:col-span-2"
          >
            {({ field, invalid, id }) => (
              <Textarea {...field} id={id} rows={3} value={(field.value as string) ?? ""} invalid={invalid} />
            )}
          </FormField>
        </EntryCard>
      ))}
    </EntryList>
  );
}

/**
 * Removes entry `i` and puts focus on the list's Add button, since the card
 * holding the focused Remove button goes with it. Rendered at once, so that a
 * full list (20) has its Add button enabled again before it is focused.
 */
function removeEntry(remove: (index: number) => void, i: number, addRef: RefObject<HTMLButtonElement | null>) {
  flushSync(() => remove(i));
  addRef.current?.focus();
}

function EntryList({
  name,
  count,
  addRef,
  addLabel,
  empty,
  onAdd,
  after,
  children,
}: {
  name: ListName;
  count: number;
  addRef: React.Ref<HTMLButtonElement>;
  addLabel: string;
  empty: string;
  onAdd: () => void;
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  const full = count >= ENTRY_LIMITS.count;
  return (
    <div className="space-y-3 md:col-span-2">
      {count > 0 ? (
        <ul className="space-y-3">{children}</ul>
      ) : (
        <p className="rounded-[18px] bg-paper-2 px-4 py-3.5 text-[13.5px] text-ink-3">{empty}</p>
      )}
      <ListError name={name} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          ref={addRef}
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="size-4" />}
          onClick={onAdd}
          disabled={full}
        >
          {addLabel}
        </Button>
        <span className="text-[12.5px] text-ink-3">
          {full
            ? `That's the most there can be (${ENTRY_LIMITS.count}). Remove one to add another.`
            : `Shown in this order · ${count}/${ENTRY_LIMITS.count}`}
        </span>
      </div>
      {after}
    </div>
  );
}

/** A message about a list as a whole (from the API, or the count cap). */
function ListError({ name }: { name: ListName }) {
  const { errors } = useFormState<Values>({ name });
  const error = errors[name] as { message?: string; root?: { message?: string } } | undefined;
  const message = error?.message ?? error?.root?.message;
  return message ? <p className="text-[12.5px] font-medium leading-snug text-danger">{message}</p> : null;
}

/** One entry: a numbered card, its fields on the form's two-column grid, and its remove button. */
function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  const titleId = useId();
  return (
    <li>
      <div role="group" aria-labelledby={titleId} className="rounded-[18px] border border-line bg-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p id={titleId} className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
            {title}
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="-mr-2 -mt-1 text-ink-3 hover:bg-danger-tint hover:text-danger"
            onClick={onRemove}
            aria-label={`Remove ${title.toLowerCase()}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
      </div>
    </li>
  );
}

function TextField({
  name,
  label,
  required,
  placeholder,
}: {
  name: FieldPath<Values>;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <FormField<Values> name={name} label={label} required={required}>
      {({ field, invalid, id }) => (
        <Input {...field} id={id} value={(field.value as string) ?? ""} invalid={invalid} placeholder={placeholder} />
      )}
    </FormField>
  );
}

/**
 * The start year, and the end year or "Present" — one field, `null` when
 * Present is ticked and "" while empty, so a missing year is never read as
 * "present". Years are kept as typed; the schema checks and converts them.
 */
function YearFields({ list, index, kind }: { list: ListName; index: number; kind: Kind }) {
  const { trigger, getFieldState } = useFormContext<Values>();
  const startName = `${list}.${index}.startYear` as FieldPath<Values>;
  const endName = `${list}.${index}.endYear` as FieldPath<Values>;
  const now = new Date().getFullYear();

  return (
    <>
      <FormField<Values> name={startName} label="Start year" required>
        {({ field, invalid, id }) => (
          <Input
            id={id}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            type="number"
            inputMode="numeric"
            min={ENTRY_LIMITS.earliestYear}
            max={now}
            step={1}
            placeholder="e.g. 2015"
            value={(field.value as string | null) ?? ""}
            invalid={invalid}
            onChange={(e) => {
              field.onChange(e.target.value);
              // The end year is checked against this one: its message may no longer hold.
              if (getFieldState(endName).error) void trigger(endName);
            }}
          />
        )}
      </FormField>
      <FormField<Values>
        name={endName}
        label="End year"
        description={kind === "education" ? "Or the expected year of graduation." : undefined}
      >
        {({ field, invalid, id }) => {
          const present = field.value === null;
          return (
            <div className="flex items-center gap-3">
              <Input
                id={id}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="number"
                inputMode="numeric"
                min={ENTRY_LIMITS.earliestYear}
                max={latestEndYear(kind)}
                step={1}
                placeholder={present ? "Present" : "e.g. 2019"}
                disabled={present}
                value={present ? "" : ((field.value as string | null) ?? "")}
                invalid={invalid}
                onChange={(e) => field.onChange(e.target.value)}
                className="min-w-0 flex-1"
              />
              <div className="flex shrink-0 items-center gap-2">
                <Checkbox
                  id={`${id}-present`}
                  checked={present}
                  onCheckedChange={(checked) => field.onChange(checked === true ? null : "")}
                />
                <label htmlFor={`${id}-present`} className="cursor-pointer text-sm font-medium text-ink-2">
                  Present
                </label>
              </div>
            </div>
          );
        }}
      </FormField>
    </>
  );
}
