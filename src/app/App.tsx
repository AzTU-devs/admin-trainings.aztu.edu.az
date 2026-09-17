import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { DashboardLayout } from "@shared/components/layout";
import { ProtectedRoute } from "@app/router/ProtectedRoute";
import { RoleGuard } from "@app/router/RoleGuard";
import { Spinner } from "@shared/components/ui/Spinner";
import { ROLES } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import { SignInPage, ForgotPasswordPage, ForbiddenPage, NotFoundPage } from "@features/auth";
import DashboardPage from "@features/dashboard/pages/DashboardPage";

/*
 * Feature pages are code-split: only the shell, the auth screens and the
 * dashboard land in the entry chunk. Everything else is fetched when its route
 * is first visited, which keeps first paint off the critical path of a bundle
 * that otherwise carried every admin and super-admin screen at once.
 */
const ProfilePage = lazy(() => import("@features/profile/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@features/profile/pages/SettingsPage"));
const CoursesListPage = lazy(() => import("@features/courses/pages/CoursesListPage"));
const CourseNewPage = lazy(() => import("@features/courses/pages/CourseNewPage"));
const CourseEditPage = lazy(() => import("@features/courses/pages/CourseEditPage"));
const ApprovalsPage = lazy(() => import("@features/courses/pages/ApprovalsPage"));
const EnrollmentsListPage = lazy(() => import("@features/enrollments/pages/EnrollmentsListPage"));
const StudentsListPage = lazy(() => import("@features/students/pages/StudentsListPage"));
const TutorRoomRequestsPage = lazy(() => import("@features/room-requests/pages/TutorRoomRequestsPage"));
const AdminRoomRequestsPage = lazy(() => import("@features/room-requests/pages/AdminRoomRequestsPage"));
const VideosListPage = lazy(() => import("@features/videos/pages/VideosListPage"));
const AdminTutorsPage = lazy(() => import("@features/tutors/pages/AdminTutorsPage"));
const RoomsListPage = lazy(() => import("@features/rooms/pages/RoomsListPage"));
const RoomPricingPage = lazy(() => import("@features/rooms/pages/RoomPricingPage"));
const BrowseRoomsPage = lazy(() => import("@features/rooms/pages/BrowseRoomsPage"));
const CategoriesPage = lazy(() => import("@features/categories/pages/CategoriesPage"));
const UsersPage = lazy(() => import("@features/users/pages/UsersPage"));
const ModerationPage = lazy(() => import("@features/moderation/pages/ModerationPage"));
const AnalyticsPage = lazy(() => import("@features/analytics/pages/AnalyticsPage"));
const AdminNotificationsPage = lazy(() => import("@features/notifications/pages/AdminNotificationsPage"));
const NotificationsPage = lazy(() => import("@features/notifications/pages/NotificationsPage"));
const AuditLogsPage = lazy(() => import("@features/audit-logs/pages/AuditLogsPage"));
const SystemMonitoringPage = lazy(() => import("@features/system-monitoring/pages/SystemMonitoringPage"));
const ApiLogsPage = lazy(() => import("@features/api-logs/pages/ApiLogsPage"));
const SecurityPage = lazy(() => import("@features/security/pages/SecurityPage"));

/** Shown while a lazily-loaded route chunk is in flight. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Top-level router. Layout is decided by route nesting:
 *
 *   /                       → redirect to /dashboard
 *   /sign-in                → SignInPage (no shell)
 *   /403, /404              → minimal error pages
 *
 *   <ProtectedRoute>        — requires auth
 *     <DashboardLayout>     — sidebar + header shell
 *       /dashboard          — everyone
 *       <RoleGuard TUTOR>   → /tutor/*       (Phase 6)
 *       <RoleGuard ADMIN>   → /admin/*       (Phase 7)
 *       <RoleGuard SUPER>   → /super/*       (Phase 8)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path={ROUTES.signIn} element={<SignInPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.unauthorized} element={<ForbiddenPage />} />
          <Route path={ROUTES.notFound} element={<NotFoundPage />} />

          {/* Authenticated shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path={ROUTES.root} element={<Navigate to={ROUTES.dashboard} replace />} />
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />

              {/* Tutor */}
              <Route element={<RoleGuard roles={[ROLES.TUTOR]} />}>
                <Route path={ROUTES.tutorCourses} element={<CoursesListPage />} />
                <Route path={ROUTES.tutorCourseNew} element={<CourseNewPage />} />
                <Route path={ROUTES.tutorCourseEdit()} element={<CourseEditPage />} />
                <Route path={ROUTES.tutorEnrollments} element={<EnrollmentsListPage />} />
                <Route path={ROUTES.tutorStudents} element={<StudentsListPage />} />
                <Route path={ROUTES.tutorRooms} element={<BrowseRoomsPage />} />
                <Route path={ROUTES.tutorRoomRequests} element={<TutorRoomRequestsPage />} />
                <Route path={ROUTES.tutorApprovals} element={<ApprovalsPage />} />
                <Route path={ROUTES.tutorVideos} element={<VideosListPage />} />
              </Route>

              {/* Admin */}
              <Route element={<RoleGuard roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
                <Route path={ROUTES.adminTutors} element={<AdminTutorsPage />} />
                <Route path={ROUTES.adminRooms} element={<RoomsListPage />} />
                <Route path={ROUTES.adminRoomPricing} element={<RoomPricingPage />} />
                <Route path={ROUTES.adminRoomRequests} element={<AdminRoomRequestsPage />} />
                <Route path={ROUTES.adminCategories} element={<CategoriesPage />} />
                <Route path={ROUTES.adminUsers} element={<UsersPage />} />
                <Route path={ROUTES.adminCourseModeration} element={<ModerationPage />} />
                <Route path={ROUTES.adminAnalytics} element={<AnalyticsPage />} />
                <Route path={ROUTES.adminNotifications} element={<AdminNotificationsPage />} />
              </Route>

              {/* Super admin */}
              <Route element={<RoleGuard roles={[ROLES.SUPER_ADMIN]} />}>
                <Route path={ROUTES.superAuditLogs} element={<AuditLogsPage />} />
                <Route path={ROUTES.superSystemMonitoring} element={<SystemMonitoringPage />} />
                <Route path={ROUTES.superApiLogs} element={<ApiLogsPage />} />
                <Route path={ROUTES.superSecurity} element={<SecurityPage />} />
              </Route>

              {/* Shared authenticated pages */}
              <Route path={ROUTES.profile} element={<ProfilePage />} />
              <Route path={ROUTES.settings} element={<SettingsPage />} />
              <Route path={ROUTES.notifications} element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
