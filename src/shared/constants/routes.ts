/**
 * Centralized route paths. Use these constants — never hardcode paths.
 */
export const ROUTES = {
  root: "/",
  signIn: "/sign-in",
  forgotPassword: "/forgot-password",
  unauthorized: "/403",
  notFound: "/404",

  dashboard: "/dashboard",

  // Tutor
  tutorCourses: "/tutor/courses",
  tutorCourseNew: "/tutor/courses/new",
  tutorCourseEdit: (id: string | number = ":id") => `/tutor/courses/${id}`,
  tutorEnrollments: "/tutor/enrollments",
  tutorStudents: "/tutor/students",
  tutorRoomRequests: "/tutor/room-requests",
  tutorRooms: "/tutor/rooms",
  tutorApprovals: "/tutor/approvals",
  tutorVideos: "/tutor/videos",

  // Admin
  adminTutors: "/admin/tutors",
  adminCourses: "/admin/courses",
  adminCourseNew: "/admin/courses/new",
  /** The new-course page with the type preset to ONE_TIME — a link target, not a route pattern. */
  adminCourseNewOneTime: "/admin/courses/new?type=ONE_TIME",
  adminCourseEdit: (id: string | number = ":id") => `/admin/courses/${id}`,
  adminCourseParticipants: (courseId: string | number = ":courseId") =>
    `/admin/courses/${courseId}/participants`,
  adminRooms: "/admin/rooms",
  adminCategories: "/admin/categories",
  adminRoomPricing: "/admin/room-pricing",
  adminRoomRequests: "/admin/room-requests",
  adminUsers: "/admin/users",
  adminCourseModeration: "/admin/course-moderation",
  adminAnalytics: "/admin/analytics",
  adminNotifications: "/admin/notifications",

  // Super Admin
  superAuditLogs: "/super/audit-logs",
  superSystemMonitoring: "/super/system-monitoring",
  superApiLogs: "/super/api-logs",
  superSecurity: "/super/security",
  /** Every training on the platform as a calendar (calendar:view). */
  superCalendar: "/super/calendar",
  /** One account's deep profile (expert and İştirakçi data, sessions, audit). Reached from people tables, not the menu. */
  superUserProfile: (userId: string | number = ":userId") => `/super/users/${userId}`,

  // Shared
  profile: "/profile",
  notifications: "/notifications",
  settings: "/settings",
} as const;
