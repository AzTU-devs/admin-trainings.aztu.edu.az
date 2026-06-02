import { Menu, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import { setMobileSidebarOpen } from "@lib/redux/uiSlice";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@features/notifications/components/NotificationBell";

export function Header() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/80 dark:bg-gray-dark/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-[margin-left] duration-300 ease-in-out"
      style={{ marginLeft: 0 }}
      data-collapsed={collapsed}
    >
      <button
        type="button"
        onClick={() => dispatch(setMobileSidebarOpen(true))}
        aria-label="Open menu"
        className="lg:hidden size-10 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 inline-flex items-center justify-center"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden md:flex flex-1 max-w-md">
        <SearchBox />
      </div>
      <div className="md:hidden flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Search"
          className="md:hidden size-10 rounded-xl text-gray-500 hover:text-brand-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 inline-flex items-center justify-center"
        >
          <Search className="size-5" />
        </button>
        <NotificationBell />
        <ThemeToggle compact />
        <span className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
        <UserMenu />
      </div>
    </header>
  );
}

function SearchBox() {
  return (
    <label className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
      <input
        type="search"
        placeholder="Search courses, students, rooms…"
        className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-dark focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-shadow"
      />
      <kbd className="hidden lg:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-dark px-1.5 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
        ⌘K
      </kbd>
    </label>
  );
}
