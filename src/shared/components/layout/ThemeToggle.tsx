import { Monitor, Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { setTheme } from "@lib/redux/uiSlice";
import type { ThemeMode } from "@shared/types/ui";
import { cn } from "@shared/lib/cn";

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
    const Cur = MODES.find((m) => m.value === theme)?.Icon ?? Sun;
    return (
      <button
        type="button"
        onClick={() => dispatch(setTheme(next))}
        aria-label={`Theme: ${theme}. Click to switch.`}
        className="size-10 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 inline-flex items-center justify-center transition-colors"
      >
        <Cur className="size-5" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1">
      {MODES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => dispatch(setTheme(value))}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            "size-8 rounded-lg inline-flex items-center justify-center transition-colors",
            theme === value
              ? "bg-white dark:bg-gray-800 text-brand-700 dark:text-white shadow-theme-xs"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
