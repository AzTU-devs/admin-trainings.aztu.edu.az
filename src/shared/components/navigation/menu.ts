import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
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
  UserCheck,
  UserRoundPlus,
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
  /**
   * A live count of work waiting behind this item (sign-ups to approve,
   * enrolment requests to decide), drawn as its badge while above zero. The
   * Sidebar asks for it only for the items it shows.
   */
  counter?: MenuCounter;
}

/** The live counts a menu item can carry (see `MenuItem.counter`). */
export type MenuCounter = "accountApprovals" | "enrollmentRequests";

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
        id: "enrollments",
        label: "Enrollments",
        icon: ClipboardCheck,
        path: ROUTES.tutorEnrollments,
        roles: [ROLES.TUTOR],
        // Requests to join the expert's own courses, decided on this page.
        counter: "enrollmentRequests",
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
        id: "admin-courses",
        label: "Courses",
        icon: BookOpen,
        path: ROUTES.adminCourses,
        roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      },
      {
        // Next to Courses because it is a view of them; the API's
        // calendar:view is granted to SUPER_ADMIN only.
        id: "training-calendar",
        label: "Training calendar",
        icon: CalendarDays,
        path: ROUTES.superCalendar,
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        // Every course's requests; an expert decides theirs on Enrollments.
        id: "enrollment-requests",
        label: "Enrolment requests",
        icon: UserRoundPlus,
        path: ROUTES.superEnrollmentRequests,
        roles: [ROLES.SUPER_ADMIN],
        counter: "enrollmentRequests",
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
        // Right before Users: the accounts waiting to become ones (user:approve, SUPER_ADMIN only).
        id: "account-approvals",
        label: "Account approvals",
        icon: UserCheck,
        path: ROUTES.superAccountApprovals,
        roles: [ROLES.SUPER_ADMIN],
        counter: "accountApprovals",
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
