import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useAuth } from "@features/auth/hooks/useAuth";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  DoorOpen,
  GraduationCap,
  TrendingUp,
  Users,
  UserCog,
  XCircle,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { StatCard } from "@shared/components/data-display/StatCard";
import { Badge } from "@shared/components/ui/Badge";
import { Spinner } from "@shared/components/ui/Spinner";
import { QueryErrorState } from "@shared/components/feedback/QueryErrorState";
import { ROUTES } from "@shared/constants/routes";
import {
  useGetAdminDashboardQuery,
  useGetTutorDashboardQuery,
} from "@features/dashboard/api/dashboardApi";
import { useListAuditLogsQuery } from "@features/audit-logs/api/auditLogsApi";
import {
  useGetMyTutorProfileQuery,
  useResubmitMyTutorProfileMutation,
} from "@features/tutors/api/tutorsApi";
import { Button } from "@shared/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { TUTOR_APPROVAL_STATUS } from "@shared/types/lms";
import { enumLabel } from "@shared/constants/enumLabels";

// The dashboard is in the entry chunk; the profile form (zod schemas, uploaders)
// is only needed by a rejected applicant, so it loads on demand.
const ExpertProfileForm = lazy(() =>
  import("@features/tutors/components/ExpertProfileForm").then((m) => ({ default: m.ExpertProfileForm })),
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { isTutor, isStaff, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  // Tutors get the tutor counters; pure staff (admin/super without tutor role)
  // get the admin counters. Skip the call that doesn't apply to this role.
  const tutor = useGetTutorDashboardQuery(undefined, { skip: !isTutor });
  const admin = useGetAdminDashboardQuery(undefined, { skip: !isStaff || isTutor });

  // A failed counter shows "—", not 0: zero is a claim about the data.
  const num = (q: { isError: boolean }, n?: number) => (q.isError ? "—" : (n ?? 0).toLocaleString());

  const tutorQuick = [
    { label: "Create new course", to: ROUTES.tutorCourseNew },
    { label: "Upload lesson video", to: ROUTES.tutorVideos },
    { label: "Request a classroom", to: ROUTES.tutorRoomRequests },
    { label: "View participants", to: ROUTES.tutorStudents },
  ];
  const staffQuick = [
    { label: "Review pending tutors", to: ROUTES.adminTutors },
    { label: "Approve room requests", to: ROUTES.adminRoomRequests },
    { label: "Add a new room", to: ROUTES.adminRooms },
    { label: "Open analytics", to: ROUTES.adminAnalytics },
  ];
  // Staff links only for staff: an applicant holding only USER used to get this
  // list, and every link in it was a 403.
  const quick = isTutor ? tutorQuick : isStaff ? staffQuick : [];

  if (!isTutor && !isStaff) {
    return (
      <>
        <PageHeader hideBreadcrumbs title={`Welcome, ${firstName}`} description="Your expert application." />
        <ApplicationStatus />
      </>
    );
  }

  return (
    <>
      <PageHeader
        hideBreadcrumbs
        title={`Welcome, ${firstName}`}
        description="Here's a snapshot of what's happening across the portal today."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isTutor && (
          <>
            <StatCard label="My courses" value={num(tutor, tutor.data?.courses)} delta={tutor.isError ? undefined : `${num(tutor, tutor.data?.publishedCourses)} published`} Icon={BookOpen} accent="brand" loading={tutor.isLoading} />
            <StatCard label="Enrolled İştirakçilər" value={num(tutor, tutor.data?.students)} Icon={Users} accent="gold" loading={tutor.isLoading} />
            <StatCard label="Courses in review" value={num(tutor, tutor.data?.coursesInReview)} delta="awaiting approval" Icon={ClipboardCheck} accent="warning" loading={tutor.isLoading} />
            <StatCard label="Approved bookings" value={num(tutor, tutor.data?.approvedBookings)} delta="classroom sessions" Icon={GraduationCap} accent="success" loading={tutor.isLoading} />
          </>
        )}
        {isStaff && !isTutor && (
          <>
            <StatCard label="Total users" value={num(admin, admin.data?.totalUsers)} delta={admin.isError ? undefined : `${num(admin, admin.data?.pendingTutorApprovals)} tutors pending`} Icon={UserCog} accent="brand" loading={admin.isLoading} />
            <StatCard label="Courses pending review" value={num(admin, admin.data?.pendingCourseReviews)} delta={admin.isError ? undefined : `${num(admin, admin.data?.publishedCourses)} published`} Icon={BookOpen} accent="warning" loading={admin.isLoading} />
            <StatCard label="Rooms" value={num(admin, admin.data?.totalRooms)} delta={admin.isError ? undefined : `${num(admin, admin.data?.pendingRoomRequests)} requests pending`} Icon={DoorOpen} accent="gold" loading={admin.isLoading} />
            <StatCard label="Total enrollments" value={num(admin, admin.data?.totalEnrollments)} Icon={TrendingUp} accent="success" loading={admin.isLoading} />
          </>
        )}
      </div>
      {(tutor.isError || admin.isError) && (
        <p role="alert" className="-mt-3 mb-6 text-sm text-error-600 dark:text-error-400">
          Some counters could not be loaded.{" "}
          <button type="button" className="font-medium underline" onClick={() => (isTutor ? tutor.refetch() : admin.refetch())}>
            Retry
          </button>
        </p>
      )}

      {/* "Recent activity" used to be a permanent placeholder for every role —
          nothing fed it. Only the audit log has a real timeline, and only a
          SUPER_ADMIN may read it, so only they get the panel. */}
      <div className={cn("grid grid-cols-1 gap-4", isSuperAdmin && "lg:grid-cols-3")}>
        {isSuperAdmin && <RecentActivity className="lg:col-span-2" />}
        <Panel title="Quick actions" description="Common tasks">
          <ul className={cn("grid gap-2", !isSuperAdmin && "sm:grid-cols-2 xl:grid-cols-4")}>
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

/** The latest audit entries — SUPER_ADMIN only (audit:read). */
function RecentActivity({ className }: { className?: string }) {
  const { currentData, isFetching, isError, error, refetch } = useListAuditLogsQuery({ page: 0, size: 8 });
  const rows = currentData?.content ?? [];
  return (
    <Panel
      className={className}
      title="Recent activity"
      description="The latest audited actions across the portal"
      action={
        <Link to={ROUTES.superAuditLogs} className="text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline">
          View all
        </Link>
      }
    >
      {isFetching && !currentData ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} what="recent activity" compact />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5 text-sm">
              <Badge tone="neutral">{enumLabel("auditAction", r.action)}</Badge>
              <span className="text-gray-900 dark:text-white">{r.actorName || r.actorEmail || "System"}</span>
              <span className="text-gray-500">{enumLabel("auditResource", r.resourceType).toLowerCase()}</span>
              <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                {new Date(r.occurredAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * What an account without TUTOR or a staff role sees: the state of its expert
 * application. ProtectedRoute has already signed out anyone without one.
 */
function ApplicationStatus() {
  const { data, isLoading, isError, error, refetch } = useGetMyTutorProfileQuery();
  const [resubmit] = useResubmitMyTutorProfileMutation();
  const [editing, setEditing] = useState(false);
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (isError || !data) return <QueryErrorState error={error} onRetry={refetch} what="your application" />;

  const s = data.approvalStatus;
  // A rejected applicant can fix the application and send it back, on an API
  // that offers /me/resubmit — the one that versions profiles. Before it, a
  // rejection was a dead end: no dashboard access, "profile exists" on apply.
  const canResubmit = s === TUTOR_APPROVAL_STATUS.REJECTED && typeof data.version === "number";
  const view =
    s === TUTOR_APPROVAL_STATUS.PENDING
      ? {
          Icon: Clock,
          tone: "text-warning-600 bg-warning-50 dark:bg-warning-500/10 dark:text-warning-300",
          title: "Your application is under review",
          body: "An administrator will review your expert profile. You'll get access to courses, rooms and your video library once it is approved.",
        }
      : s === TUTOR_APPROVAL_STATUS.APPROVED
        ? {
            Icon: ClipboardCheck,
            tone: "text-success-600 bg-success-50 dark:bg-success-500/10 dark:text-success-300",
            title: "Your application was approved",
            body: "Sign out and back in to open the expert tools.",
          }
        : {
            Icon: XCircle,
            tone: "text-error-600 bg-error-50 dark:bg-error-500/10 dark:text-error-300",
            title: s === TUTOR_APPROVAL_STATUS.SUSPENDED ? "Your expert profile is suspended" : "Your application was not approved",
            body: canResubmit
              ? "Update your profile with what the reviewers asked for and send it for approval again."
              : "Contact the platform administrators if you'd like it reconsidered.",
          };

  return (
    <Panel title="Expert application">
      <div className="flex items-start gap-4">
        <span className={cn("size-12 shrink-0 rounded-2xl inline-flex items-center justify-center", view.tone)}>
          <view.Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-white">{view.title}</p>
          {s === TUTOR_APPROVAL_STATUS.REJECTED && data.rejectionReason && (
            <p className="mt-2 rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap max-w-2xl">
              <span className="font-medium">Reviewer's note: </span>
              {data.rejectionReason}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 max-w-2xl">{view.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {canResubmit && <Button onClick={() => setEditing(true)}>Edit and resubmit</Button>}
            <Link to={ROUTES.profile} className="text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline">
              View my profile
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Resubmit your application</DialogTitle>
            <DialogDescription>Saving sends your profile back to the reviewers.</DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
            <ExpertProfileForm
              key={data.id}
              profile={data}
              submitLabel="Resubmit for approval"
              successMessage="Application sent back for review"
              // The resubmit endpoint takes the same body as a profile edit, and
              // answers for a rejected profile even when nothing else changed.
              allowUnchanged
              onSave={(body) => resubmit(body).unwrap()}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
