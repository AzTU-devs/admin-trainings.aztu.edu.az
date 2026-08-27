import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Video,
  Users,
  CalendarClock,
  ClipboardCheck,
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
  children?: MenuItem[];
  badge?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

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
      },
    ],
  },
  {
    id: "teaching",
    label: "Teaching",
    items: [
      {
        id: "courses",
        label: "Courses",
        icon: BookOpen,
        path: ROUTES.tutorCourses,
        roles: [ROLES.TUTOR],
      },
      {
        id: "trainings",
        label: "Trainings",
        icon: GraduationCap,
        path: ROUTES.tutorTrainings,
        roles: [ROLES.TUTOR],
      },
      {
        id: "enrollments",
        label: "Enrollments",
        icon: ClipboardCheck,
        path: ROUTES.tutorEnrollments,
        roles: [ROLES.TUTOR],
      },
      {
        id: "students",
        label: "Students",
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
        label: "My room requests",
        icon: CalendarClock,
        path: ROUTES.tutorRoomRequests,
        roles: [ROLES.TUTOR],
      },
      {
        id: "approvals",
        label: "Approvals",
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
        label: "Booking requests",
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
): MenuGroup[] {
  const userRoleSet = new Set<Role>(userRoles);
  const allowed = (item: MenuItem) =>
    !item.roles || item.roles.some((r) => userRoleSet.has(r));

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
