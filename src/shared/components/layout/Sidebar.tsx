import { NavLink } from "react-router";
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
import { usePermissions } from "@features/auth/hooks/usePermissions";

export function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileSidebarOpen);
  const { roles } = usePermissions();
  // Only render the menu items the current user's roles can access — a tutor
  // must never see the Administration / System groups, etc.
  const groups = filterMenuForRoles(MENU_GROUPS, roles);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className="lg:hidden fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen flex flex-col bg-white dark:bg-gray-dark border-r border-gray-200 dark:border-gray-800 transition-[width,transform] duration-300 ease-in-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[84px]" : "w-[272px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} onClose={() => dispatch(setMobileSidebarOpen(false))} />

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
          <ul className="space-y-6">
            {groups.map((g) => (
              <li key={g.id}>
                {!collapsed && (
                  <h3 className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                    {g.label}
                  </h3>
                )}
                <ul className="space-y-1">
                  {g.items.map((item) => (
                    <SidebarLink key={item.id} item={item} collapsed={collapsed} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:flex border-t border-gray-200 dark:border-gray-800 p-3">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl text-sm font-medium text-gray-500 hover:text-brand-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-2 w-full",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-5" /> : <ChevronsLeft className="size-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarHeader({ collapsed, onClose }: { collapsed: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        "h-16 shrink-0 flex items-center border-b border-gray-200 dark:border-gray-800 px-4",
        collapsed ? "justify-center" : "justify-between",
      )}
    >
      <NavLink to="/dashboard" className="flex items-center gap-2.5">
        <img src="/images/logo/aztu-logo-mark.png" alt="AzTU" className="size-9 shrink-0 object-contain dark:brightness-0 dark:invert" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold text-brand-700 dark:text-white">AzTU Portal</p>
            <p className="text-[9px] tracking-[0.18em] uppercase text-gray-500 dark:text-gray-400">
              Az. Technical Uni.
            </p>
          </div>
        )}
      </NavLink>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white"
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
            "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
            collapsed && "justify-center",
            isActive
              ? "bg-brand-700 text-white shadow-theme-sm"
              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
          )
        }
        title={collapsed ? item.label : undefined}
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                "size-5 shrink-0",
                isActive ? "text-white" : "text-gray-500 group-hover:text-brand-700 dark:text-gray-400 dark:group-hover:text-white",
              )}
            />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span
                className={cn(
                  "rounded-full text-[10px] font-semibold px-2 py-0.5",
                  isActive ? "bg-white/20 text-white" : "bg-aztu-gold-100 text-aztu-gold-700 dark:bg-aztu-gold-500/15 dark:text-aztu-gold-300",
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
