import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@lib/redux/hooks";
import {
  setMobileSidebarOpen,
  toggleSidebar,
} from "@lib/redux/uiSlice";
import { cn } from "@shared/lib/cn";
import {
  MENU_GROUPS,
  filterMenuForRoles,
  type MenuItem,
} from "@shared/components/navigation/menu";
import { Kicker } from "@shared/components/bright/Kicker";
import { MQ, useMediaQuery } from "@shared/lib/useMediaQuery";
import { useScrollFade } from "@shared/lib/useScrollFade";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { Logo } from "./Logo";

/*
 * The navigation column, drawn as the website's participant sidebar: a white
 * rounded card floating on the paper canvas (night: one surface step up).
 * Section labels are kickers with the gold rule; items are 44px pills, and the
 * current page gets the navy tint plus a small gold marker.
 *
 * The super admin menu (16 items, 3 labels) is taller than a laptop window:
 * on short screens (`short:`, ≤1000px) the items drop to 40px and the groups
 * close up (label 2px above its first item, 12px between groups), so the whole
 * menu fits a 1440×900 screen. Where it still overflows (a browser window
 * ~780px tall) the edge with more items past it fades over 12px — only while
 * more than the list's own end padding is hidden, so a last item that fits
 * (Security) never sits greyed out under a fade and reads as disabled.
 *
 * Below lg it is an off-canvas drawer: a modal dialog while open (focus moves
 * in and is kept there, Escape and following a link close it, focus goes back
 * to the menu button), and inert while closed so its links are not tabbed
 * through off-screen.
 *
 * Widths are mirrored in DashboardLayout's left padding (272 / 92).
 */
export function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileSidebarOpen);
  const { roles } = usePermissions();
  // Only render the menu items the current user's roles can access — a tutor
  // must never see the Administration / System groups, etc.
  const groups = filterMenuForRoles(MENU_GROUPS, roles);
  const navRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const desktop = useMediaQuery(MQ.lg, true);
  const drawer = !desktop && mobileOpen;
  // slack = the nav's end padding (pb-3): hidden padding is not "more".
  useScrollFade(navRef, "y", { slack: 12 });

  // Following a link in the drawer closes it — the new page used to sit
  // under the still-open menu. Only on a change of route, not on opening.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (mobileOpen) dispatch(setMobileSidebarOpen(false));
  }, [pathname, mobileOpen, dispatch]);

  // The open drawer is a modal: focus goes to its Close button, Tab stays
  // inside, Escape closes it, and focus returns to whatever opened it (the
  // header's menu button).
  useEffect(() => {
    if (!drawer) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch(setMobileSidebarOpen(false));
        return;
      }
      if (e.key !== "Tab" || !asideRef.current) return;
      const items = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = asideRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [drawer, dispatch]);

  // The full menu is taller than a laptop screen, so a System page's item sat
  // below the fold. Bring the current item into view — scrolling only the
  // nav column, never the page — when the route or the width changes.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const box = nav.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    if (item.top < box.top || item.bottom > box.bottom) {
      nav.scrollTop += item.top - box.top - (box.height - item.height) / 2;
    }
  }, [pathname, collapsed]);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className="fixed inset-0 z-40 animate-fade-in bg-scrim backdrop-blur-[3px] lg:hidden"
        />
      )}

      <aside
        ref={asideRef}
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer || undefined}
        aria-label={drawer ? "Menu" : undefined}
        // Off-canvas and closed: out of the tab order and the reading order.
        inert={!desktop && !mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex p-3 transition-[width,translate] duration-300 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[92px]" : "w-[272px]",
        )}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-sm)]">
          <SidebarHeader
            collapsed={collapsed}
            closeRef={closeRef}
            onClose={() => dispatch(setMobileSidebarOpen(false))}
          />

          <nav
            ref={navRef}
            className={cn(
              "custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-3 pt-1 [--fade:12px]",
              collapsed ? "px-[10px]" : "px-3",
            )}
          >
            <ul className="space-y-4 short:space-y-3">
              {groups.map((g, i) => (
                <li key={g.id}>
                  {!collapsed ? (
                    // `flex`, not the kicker's inline-flex: inline, it sat in a
                    // 24px line box and every label took 9px more than it shows.
                    <Kicker as="h3" className="mb-1.5 flex px-3.5 short:mb-0.5">
                      {g.label}
                    </Kicker>
                  ) : (
                    // Collapsed, the groups stay apart with a short hairline.
                    i > 0 && <div aria-hidden className="mx-auto mb-3 h-px w-6 bg-line short:mb-2" />
                  )}
                  <ul className="space-y-0.5 short:space-y-0">
                    {g.items.map((item) => (
                      <SidebarLink key={item.id} item={item} collapsed={collapsed} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden border-t border-line p-2.5 short:p-2 lg:flex">
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className={cn(
                "inline-flex h-10 w-full items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink short:h-9",
                collapsed && "justify-center px-0",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-[18px]" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarHeader({
  collapsed,
  closeRef,
  onClose,
}: {
  collapsed: boolean;
  closeRef: React.Ref<HTMLButtonElement>;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-[72px] shrink-0 items-center short:h-16",
        collapsed ? "justify-center px-2" : "justify-between pl-5 pr-3",
      )}
    >
      <NavLink to="/dashboard" className="min-w-0 rounded-xl">
        <Logo showText={!collapsed} />
      </NavLink>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="inline-flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

function SidebarLink({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const Icon = item.icon;
  if (!item.path) return null;

  return (
    <li>
      <NavLink
        to={item.path}
        end={item.path === "/dashboard"}
        className={({ isActive }) =>
          cn(
            "group relative flex h-11 items-center gap-3 rounded-full px-3.5 text-[14px] transition-colors duration-200 short:h-10",
            collapsed && "justify-center px-0",
            isActive
              ? "bg-navy-tint font-semibold text-navy"
              : "font-medium text-ink-2 hover:bg-ink/5 hover:text-ink",
          )
        }
        title={collapsed ? item.label : undefined}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden
                className="absolute left-1.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gold"
              />
            )}
            <Icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                isActive ? "text-navy" : "text-ink-3 group-hover:text-ink",
              )}
            />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[10.5px] font-semibold text-gold-ink">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
