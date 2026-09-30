import { useEffect, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from "lucide-react";
import { FormField } from "@shared/components/forms/FormField";
import { RichTextEditor } from "@shared/components/forms/RichTextEditor";
import { Input } from "@shared/components/ui/Input";
import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { isRichTextEmpty } from "@shared/lib/richText";
import type { CourseFormValues } from "@features/courses/schemas/course.schema";

const MAX_ITEMS = 100;

/**
 * The course syllabus as a list of topics, added one at a time — each with a
 * title and an optional rich-text description — instead of one free-text box.
 * Order is the order shown to participants; the arrows move an item.
 *
 * A description editor is only mounted for items that have (or are being
 * given) a description, so a 40-topic syllabus is not 40 live editors.
 */
export function SyllabusEditor() {
  const { control } = useFormContext<CourseFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "syllabusItems" });
  const items = useWatch({ control, name: "syllabusItems" });
  // Items whose description editor the author opened in this session.
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  // The title input of an item just added, focused once it has rendered.
  const focusNext = useRef<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (focusNext.current === null) return;
    const input = listRef.current?.querySelector<HTMLInputElement>(
      `[data-syllabus-title="${focusNext.current}"]`,
    );
    input?.focus();
    focusNext.current = null;
  }, [fields.length]);

  const add = () => {
    focusNext.current = fields.length;
    append({ title: "", description: "" });
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-line-2 bg-paper/60 px-6 py-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-navy-tint text-navy">
            <ListPlus className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">No topics yet</p>
            <p className="mt-1 text-[13px] text-ink-3">
              Add the syllabus one topic at a time — a title, and details if it needs them.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={add}>
            Add the first topic
          </Button>
        </div>
      ) : (
        <ol ref={listRef} className="space-y-3">
          {fields.map((f, index) => {
            const description = items?.[index]?.description;
            const showEditor = opened.has(f.id) || !isRichTextEmpty(description);
            return (
              <li key={f.id} className="rounded-[18px] border border-line bg-surface p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-navy-tint font-mono text-[12.5px] font-semibold text-navy"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <FormField<CourseFormValues> name={`syllabusItems.${index}.title`} label={`Topic ${index + 1}`} required>
                      {({ field, invalid, id }) => (
                        <Input
                          {...field}
                          id={id}
                          data-syllabus-title={index}
                          value={(field.value as string) ?? ""}
                          invalid={invalid}
                          maxLength={200}
                          placeholder="e.g. Variables and data types"
                          // Enter adds the next topic rather than submitting the whole course.
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (fields.length < MAX_ITEMS) add();
                            }
                          }}
                        />
                      )}
                    </FormField>
                    {showEditor ? (
                      <FormField<CourseFormValues> name={`syllabusItems.${index}.description`} label="Details">
                        {({ field, invalid }) => (
                          <RichTextEditor
                            value={field.value as string}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={invalid}
                            minHeight="sm"
                            ariaLabel={`Topic ${index + 1} details`}
                            placeholder="What this topic covers, exercises, reading…"
                          />
                        )}
                      </FormField>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpened((s) => new Set(s).add(f.id))}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline"
                      >
                        <Plus className="size-3.5" /> Add details
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <IconAction label="Move up" disabled={index === 0} onClick={() => move(index, index - 1)}>
                      <ArrowUp />
                    </IconAction>
                    <IconAction
                      label="Move down"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown />
                    </IconAction>
                    <IconAction label="Remove topic" danger onClick={() => remove(index)}>
                      <Trash2 />
                    </IconAction>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {fields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-3">
            {fields.length} {fields.length === 1 ? "topic" : "topics"} · press Enter in a title to add the next
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={add}
            disabled={fields.length >= MAX_ITEMS}
          >
            Add topic
          </Button>
        </div>
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors [&_svg]:size-4",
        "hover:bg-ink/6 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/35",
        danger && "hover:bg-danger-tint hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
