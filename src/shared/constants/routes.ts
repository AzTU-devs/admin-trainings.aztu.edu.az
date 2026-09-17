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

  // Shared
  profile: "/profile",
  notifications: "/notifications",
  settings: "/settings",
} as const;
