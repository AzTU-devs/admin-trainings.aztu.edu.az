import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { DashboardLayout } from "@shared/components/layout";
import { ProtectedRoute } from "@app/router/ProtectedRoute";
import { RoleGuard } from "@app/router/RoleGuard";
import { ROLES } from "@shared/constants/roles";
import { ROUTES } from "@shared/constants/routes";
import {
  SignInPage,
  ForbiddenPage,
  NotFoundPage,
} from "@features/auth";
import DashboardPage from "@features/dashboard/pages/DashboardPage";
import {
  CoursesListPage,
  CourseNewPage,
  CourseEditPage,
} from "@features/courses";
import ApprovalsPage from "@features/courses/pages/ApprovalsPage";
import { TrainingsListPage, TrainingNewPage } from "@features/trainings";
import EnrollmentsListPage from "@features/enrollments/pages/EnrollmentsListPage";
import StudentsListPage from "@features/students/pages/StudentsListPage";
import { TutorRoomRequestsPage, AdminRoomRequestsPage } from "@features/room-requests";
import { VideosListPage } from "@features/videos";
import { AdminTutorsPage } from "@features/tutors";
import { RoomsListPage, RoomPricingPage, BrowseRoomsPage } from "@features/rooms";
import { CategoriesPage } from "@features/categories";
import { UsersPage } from "@features/users";
import { ModerationPage } from "@features/moderation";
import { AnalyticsPage } from "@features/analytics";
import { AdminNotificationsPage, NotificationsPage } from "@features/notifications";
import { AuditLogsPage } from "@features/audit-logs";
import { SystemMonitoringPage } from "@features/system-monitoring";
import { ApiLogsPage } from "@features/api-logs";
import { SecurityPage } from "@features/security";

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
      <Routes>
        {/* Public */}
        <Route path={ROUTES.signIn} element={<SignInPage />} />
        <Route path={ROUTES.unauthorized} element={<ForbiddenPage />} />
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />

        {/* Authenticated shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.root} element={<Navigate to={ROUTES.dashboard} replace />} />
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />

            {/* Tutor */}
            <Route element={<RoleGuard roles={[ROLES.TUTOR]} />}>
              <Route path="/tutor/courses" element={<CoursesListPage />} />
              <Route path="/tutor/courses/new" element={<CourseNewPage />} />
              <Route path="/tutor/courses/:id" element={<CourseEditPage />} />
              <Route path="/tutor/trainings" element={<TrainingsListPage />} />
              <Route path="/tutor/trainings/new" element={<TrainingNewPage />} />
              <Route path="/tutor/enrollments" element={<EnrollmentsListPage />} />
              <Route path="/tutor/students" element={<StudentsListPage />} />
              <Route path="/tutor/rooms" element={<BrowseRoomsPage />} />
              <Route path="/tutor/room-requests" element={<TutorRoomRequestsPage />} />
              <Route path="/tutor/approvals" element={<ApprovalsPage />} />
              <Route path="/tutor/videos" element={<VideosListPage />} />
            </Route>

            {/* Admin */}
            <Route element={<RoleGuard roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
              <Route path="/admin/tutors" element={<AdminTutorsPage />} />
              <Route path="/admin/rooms" element={<RoomsListPage />} />
              <Route path="/admin/room-pricing" element={<RoomPricingPage />} />
              <Route path="/admin/room-requests" element={<AdminRoomRequestsPage />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/course-moderation" element={<ModerationPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            </Route>

            {/* Super admin */}
            <Route element={<RoleGuard roles={[ROLES.SUPER_ADMIN]} />}>
              <Route path="/super/audit-logs" element={<AuditLogsPage />} />
              <Route path="/super/system-monitoring" element={<SystemMonitoringPage />} />
              <Route path="/super/api-logs" element={<ApiLogsPage />} />
              <Route path="/super/security" element={<SecurityPage />} />
            </Route>

            {/* Shared authenticated pages (placeholders until Phase 9) */}
            <Route path={ROUTES.profile} element={<ComingSoon area="Profile" />} />
            <Route path={ROUTES.settings} element={<ComingSoon area="Settings" />} />
            <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function ComingSoon({ area }: { area: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-12 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-aztu-gold-600 dark:text-aztu-gold-400 font-semibold mb-2">
        Coming soon
      </p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{area}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This section will be built in a later phase.
      </p>
    </div>
  );
}
