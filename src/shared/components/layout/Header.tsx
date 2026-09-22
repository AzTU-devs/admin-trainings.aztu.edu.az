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
 * Top bar of the authenticated shell — the website's header in its scrolled
 * state: translucent paper with a blur, a pill search field, round icon
 * buttons and the avatar pill.
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
    <>
      <header className="sticky top-0 z-30 w-full border-b border-line/80 bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
        {/* 60px on a phone, where the bar is permanent chrome on a short screen. */}
        <div className="mx-auto flex h-[60px] w-full max-w-[1600px] items-center gap-2 px-4 sm:h-[68px] sm:gap-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => dispatch(setMobileSidebarOpen(true))}
            aria-label="Open menu"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          {/* The sidebar is off-canvas below lg, so the bar carries the brand there. */}
          <NavLink to={ROUTES.dashboard} className="shrink-0 rounded-xl lg:hidden">
            <Logo showText={false} />
          </NavLink>

          <div className="hidden min-w-0 flex-1 md:flex">
            <SearchBox inputRef={searchRef} />
          </div>
          <div className="flex-1 md:hidden" />

          <div className="flex shrink-0 items-center gap-1">
            {/* The bell belongs to the notifications feature; round its trigger
                to match the other icon buttons here. */}
            <div className="flex [&>button]:rounded-full [&>button]:text-ink-2">
              <NotificationBell />
            </div>
            <ThemeToggle compact />
            <span aria-hidden className="mx-1.5 hidden h-7 w-px bg-line md:block" />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Below md the field gets its own row rather than hiding behind a
          magnifier button with nowhere to open. It sits in the page flow, not
          in the sticky bar, so it scrolls away instead of holding another
          57px of a phone screen. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-3 sm:px-6 md:hidden">
        <SearchBox />
      </div>
    </>
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
    <form onSubmit={submit} role="search" className="relative w-full max-w-lg">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Search courses…"
        aria-label="Search courses"
        // 16px below sm (iOS zooms into smaller fields on focus); ink-3
        // placeholder, as on every search box — it is the field's only label.
        className="h-11 w-full rounded-full border-0 bg-surface pl-11 pr-16 text-base text-ink shadow-[inset_0_0_0_1px_var(--control-line)] transition-shadow duration-200 placeholder:text-ink-3 hover:shadow-[inset_0_0_0_1px_var(--ink-3)] focus:shadow-[inset_0_0_0_1.5px_var(--focus),0_0_0_3px_color-mix(in_oklch,var(--focus)_25%,transparent)] focus:outline-none sm:text-sm"
      />
      <kbd className="kbd pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 lg:inline-flex">
        ⌘K
      </kbd>
    </form>
  );
}
