import { Monitor, Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { setTheme } from "@lib/redux/uiSlice";
import type { ThemeMode } from "@shared/types/ui";
import { cn } from "@shared/lib/cn";
import { Hint } from "@shared/components/ui/Tooltip";

const MODES: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  if (compact) {
    const next: ThemeMode = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    // The icon names the setting — a sun, a moon, or the monitor while it
    // follows the system (as in the full toggle below). It used to be a sun
    // or moon with a gold dot for "system", and that dot, beside the bell's
    // gold count, read as "something new here": gold is kept for unread.
    // The label is in the tooltip too, not only in the aria-label.
    const Cur = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
    const label = `Theme: ${theme}. Click to switch.`;
    return (
      <Hint label={label} side="bottom">
        <button
          type="button"
          onClick={() => dispatch(setTheme(next))}
          aria-label={label}
          className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink"
        >
          <Cur className="size-5" />
        </button>
      </Hint>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--line)]">
      {MODES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => dispatch(setTheme(value))}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-200",
            theme === value
              ? "bg-surface text-ink shadow-[0_1px_2px_oklch(0_0_0/0.08),0_0_0_1px_var(--line)] dark:bg-[color-mix(in_oklch,var(--navy)_16%,var(--surface-2))] dark:text-navy dark:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--navy)_40%,transparent)]"
              : "text-ink-3 hover:text-ink",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
