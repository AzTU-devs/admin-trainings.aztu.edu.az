import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Video,
  Users,
  CalendarClock,
  ShieldCheck,
  DoorOpen,
  Tags,
  CircleDollarSign,
  UserCog,
  Gavel,
  BarChart3,
  Bell,
  Megaphone,
  ScrollText,
  Activity,
  Network,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@shared/constants/routes";
import { ROLES, type Role } from "@shared/constants/roles";

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  /** Required roles — user must have at least one. Omit for everyone. */
  roles?: Role[];
  /** API permission the page needs; the item is hidden when the account lacks it. */
  permission?: string;
  children?: MenuItem[];
  badge?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

/*
 * Each label is the title of the page it opens (the routes smoke test checks
 * this). "Booking requests" and "My room requests" both opened a page called
 * "Room bookings", so the menu and the page seemed to be two different things.
 */
export const MENU_GROUPS: MenuGroup[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: ROUTES.dashboard,
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        path: ROUTES.notifications,
        // ADMIN has no inbox permission on the API; the page was a 403.
        permission: "notification:read_own",
      },
    ],
  },
  {
    id: "teaching",
    label: "Teaching",
    items: [
      {
        id: "courses",
        label: "My courses",
        icon: BookOpen,
        path: ROUTES.tutorCourses,
        roles: [ROLES.TUTOR],
      },
      {
        id: "students",
        label: "İştirakçilər",
        icon: Users,
        path: ROUTES.tutorStudents,
        roles: [ROLES.TUTOR],
      },
      {
        id: "browse-rooms",
        label: "Browse rooms",
        icon: DoorOpen,
        path: ROUTES.tutorRooms,
        roles: [ROLES.TUTOR],
      },
      {
        id: "room-requests-tutor",
        label: "Room bookings",
        icon: CalendarClock,
        path: ROUTES.tutorRoomRequests,
        roles: [ROLES.TUTOR],
      },
      {
        id: "approvals",
        label: "Approval status",
        icon: ShieldCheck,
        path: ROUTES.tutorApprovals,
        roles: [ROLES.TUTOR],
      },
      {
        id: "videos",
        label: "Video library",
        icon: Video,
        path: ROUTES.tutorVideos,
        roles: [ROLES.TUTOR],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "admin-courses",
        label: "Courses",
        icon: BookOpen,
        path: ROUTES.adminCourses,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "tutors",
        label: "Tutors",
        icon: GraduationCap,
        path: ROUTES.adminTutors,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "rooms",
        label: "Rooms",
        icon: DoorOpen,
        path: ROUTES.adminRooms,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "room-pricing",
        label: "Room pricing",
        icon: CircleDollarSign,
        path: ROUTES.adminRoomPricing,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "room-requests-admin",
        label: "Room bookings",
        icon: CalendarClock,
        path: ROUTES.adminRoomRequests,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "categories",
        label: "Categories",
        icon: Tags,
        path: ROUTES.adminCategories,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "users",
        label: "Users",
        icon: UserCog,
        path: ROUTES.adminUsers,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "admin-notifications",
        label: "Broadcasts",
        icon: Megaphone,
        path: ROUTES.adminNotifications,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "moderation",
        label: "Course moderation",
        icon: Gavel,
        path: ROUTES.adminCourseModeration,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: BarChart3,
        path: ROUTES.adminAnalytics,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "audit-logs",
        label: "Audit logs",
        icon: ScrollText,
        path: ROUTES.superAuditLogs,
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        id: "system-monitoring",
        label: "System monitoring",
        icon: Activity,
        path: ROUTES.superSystemMonitoring,
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        id: "api-logs",
        label: "API logs",
        icon: Network,
        path: ROUTES.superApiLogs,
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        id: "security",
        label: "Security",
        icon: Lock,
        path: ROUTES.superSecurity,
        roles: [ROLES.SUPER_ADMIN],
      },
    ],
  },
];

/** Returns menu groups filtered to the items the given roles can access. */
export function filterMenuForRoles(
  groups: MenuGroup[],
  userRoles: Role[],
  can: (permission: string) => boolean = () => true,
): MenuGroup[] {
  const userRoleSet = new Set<Role>(userRoles);
  const allowed = (item: MenuItem) =>
    (!item.roles || item.roles.some((r) => userRoleSet.has(r))) &&
    (!item.permission || can(item.permission));

  return groups
    .map((g) => ({
      ...g,
      items: g.items
        .filter(allowed)
        .map((item) =>
          item.children
            ? { ...item, children: item.children.filter(allowed) }
            : item,
        ),
    }))
    .filter((g) => g.items.length > 0);
}
