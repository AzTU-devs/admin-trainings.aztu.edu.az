import { cn } from "@shared/lib/cn";

interface Props {
  /**
   * What is being saved, on the bar's left (from sm up) — the course editor
   * names the course there. Without it the bar shrinks to its buttons.
   */
  label?: string;
  /** The form's buttons (Cancel, Save …), right-aligned. */
  children: React.ReactNode;
  className?: string;
}

/**
 * The course editor's sticky save bar, for the profile and settings forms:
 * a frosted pill that rides the bottom of the viewport while its form
 * scrolls past, and settles under the last card when reached. Put it as the
 * form's last child (sticky is scoped to the form). Same classes as
 * CourseDetailsForm's bar so every long form in the dashboard saves the same
 * way; it lives here because that one is part of the course form.
 */
export function StickySaveBar({ label, children, className }: Props) {
  const named = !!label?.trim();
  return (
    <div
      className={cn(
        "glass sticky bottom-3 z-20 flex items-center justify-end gap-3 rounded-[22px] p-2.5 shadow-[0_0_0_1px_var(--line),var(--shadow-md)] sm:bottom-5 sm:gap-4",
        // Named: a full-width bar from sm up (the label is hidden on phones,
        // where the bar is only its buttons); unnamed: just the buttons.
        named ? "ml-auto w-fit sm:ml-0 sm:w-auto sm:pl-5" : "ml-auto w-fit",
        className,
      )}
    >
      {named && (
        <p className="mr-auto hidden min-w-0 truncate font-display text-[15px] font-bold tracking-[-0.012em] text-ink-2 sm:block">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
