import { useNavigate } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useAuth } from "@features/auth/hooks/useAuth";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import {
  BookOpen,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  TrendingUp,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { StatCard } from "@shared/components/data-display/StatCard";
import { ROUTES } from "@shared/constants/routes";
import {
  useGetAdminDashboardQuery,
  useGetTutorDashboardQuery,
} from "@features/dashboard/api/dashboardApi";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isTutor, isStaff } = usePermissions();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  // Tutors get the tutor counters; pure staff (admin/super without tutor role)
  // get the admin counters. Skip the call that doesn't apply to this role.
  const tutor = useGetTutorDashboardQuery(undefined, { skip: !isTutor });
  const admin = useGetAdminDashboardQuery(undefined, { skip: !isStaff || isTutor });

  const num = (n?: number) => (n ?? 0).toLocaleString();

  const tutorQuick = [
    { label: "Create new course", to: ROUTES.tutorCourseNew },
    { label: "Upload lesson video", to: ROUTES.tutorVideos },
    { label: "Request a classroom", to: ROUTES.tutorRoomRequests },
    { label: "View enrollments", to: ROUTES.tutorEnrollments },
  ];
  const staffQuick = [
    { label: "Review pending tutors", to: ROUTES.adminTutors },
    { label: "Approve room requests", to: ROUTES.adminRoomRequests },
    { label: "Add a new room", to: ROUTES.adminRooms },
    { label: "Open analytics", to: ROUTES.adminAnalytics },
  ];
  const quick = isTutor ? tutorQuick : staffQuick;

  return (
    <>
      <PageHeader
        hideBreadcrumbs
        title={`Welcome back, ${firstName}`}
        description="Here's a snapshot of what's happening across the portal today."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isTutor && (
          <>
            <StatCard label="My courses" value={num(tutor.data?.courses)} delta={`${num(tutor.data?.publishedCourses)} published`} Icon={BookOpen} accent="brand" loading={tutor.isLoading} />
            <StatCard label="Enrolled students" value={num(tutor.data?.students)} Icon={Users} accent="gold" loading={tutor.isLoading} />
            <StatCard label="Courses in review" value={num(tutor.data?.coursesInReview)} delta="awaiting approval" Icon={ClipboardCheck} accent="warning" loading={tutor.isLoading} />
            <StatCard label="Approved bookings" value={num(tutor.data?.approvedBookings)} delta="classroom sessions" Icon={GraduationCap} accent="success" loading={tutor.isLoading} />
          </>
        )}
        {isStaff && !isTutor && (
          <>
            <StatCard label="Total users" value={num(admin.data?.totalUsers)} delta={`${num(admin.data?.pendingTutorApprovals)} tutors pending`} Icon={UserCog} accent="brand" loading={admin.isLoading} />
            <StatCard label="Courses pending review" value={num(admin.data?.pendingCourseReviews)} delta={`${num(admin.data?.publishedCourses)} published`} Icon={BookOpen} accent="warning" loading={admin.isLoading} />
            <StatCard label="Rooms" value={num(admin.data?.totalRooms)} delta={`${num(admin.data?.pendingRoomRequests)} requests pending`} Icon={DoorOpen} accent="gold" loading={admin.isLoading} />
            <StatCard label="Total enrollments" value={num(admin.data?.totalEnrollments)} Icon={TrendingUp} accent="success" loading={admin.isLoading} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2" title="Recent activity" description="Latest events across your scope">
          <EmptyHint message="Activity timeline will populate once you start using the portal." />
        </Panel>
        <Panel title="Quick actions" description="Common tasks">
          <ul className="space-y-2">
            {quick.map((q) => (
              <li key={q.label}>
                <button
                  type="button"
                  onClick={() => navigate(q.to)}
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800"
                >
                  {q.label}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-5", className)}>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl py-10 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
      {message}
    </div>
  );
}
