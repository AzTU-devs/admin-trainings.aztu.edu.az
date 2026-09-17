import { useCallback, useEffect, useRef } from "react";
import { Menu, Search } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { useAppDispatch } from "@lib/redux/hooks";
import { setMobileSidebarOpen } from "@lib/redux/uiSlice";
import { ROUTES } from "@shared/constants/routes";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Logo } from "./Logo";
import { NotificationBell } from "@features/notifications/components/NotificationBell";

/**
 * Top bar of the authenticated shell.
 *
 * The <header> is full-bleed across the content column; an inner container
 * carries the same padding and max-width as <main>, so the bar spans the whole
 * width while its controls stay aligned with the page content beneath it.
 */
export function Header() {
  const dispatch = useAppDispatch();
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  // The ⌘K hint rendered in the field has to actually do something.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-dark/85">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => dispatch(setMobileSidebarOpen(true))}
          aria-label="Open menu"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Menu className="size-5" />
        </button>

        {/* The sidebar is off-canvas below lg, so the bar carries the brand there. */}
        <NavLink to={ROUTES.dashboard} className="shrink-0 lg:hidden">
          <Logo showText={false} />
        </NavLink>

        <div className="hidden min-w-0 flex-1 md:flex">
          <SearchBox inputRef={searchRef} />
        </div>
        <div className="flex-1 md:hidden" />

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <ThemeToggle compact />
          <span className="mx-1 hidden h-8 w-px bg-gray-200 md:block dark:bg-gray-800" />
          <UserMenu />
        </div>
      </div>

      {/* Below md the field moves to its own row rather than being hidden behind
          a magnifier button that had nowhere to open a search UI. */}
      <div className="border-t border-gray-100 px-4 pb-2.5 pt-1 md:hidden dark:border-gray-800">
        <SearchBox />
      </div>
    </header>
  );
}

/**
 * Submits to the course list's server-side search (`?q=`).
 *
 * It used to be an uncontrolled input with no form and no handler, so typing into
 * it and pressing Enter did nothing at all. Courses are the only entity with a
 * free-text endpoint today, so that is where this goes and what the placeholder
 * now says — it previously promised students and rooms too. Widening it back out
 * means giving students and rooms a `q` parameter first, then dispatching on the
 * match type here.
 */
function SearchBox({ inputRef }: { inputRef?: React.Ref<HTMLInputElement> }) {
  const navigate = useNavigate();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const term = typeof q === "string" ? q.trim() : "";
    // An empty submit goes to the unfiltered list rather than nowhere, which is
    // what clearing the field and pressing Enter is asking for.
    navigate(term ? `${ROUTES.tutorCourses}?q=${encodeURIComponent(term)}` : ROUTES.tutorCourses);
  };

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Search courses…"
        aria-label="Search courses"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-14 text-sm text-gray-900 transition-shadow placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-gray-800 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-dark"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500 lg:inline-flex dark:border-gray-700 dark:bg-gray-dark dark:text-gray-400">
        ⌘K
      </kbd>
    </form>
  );
}
