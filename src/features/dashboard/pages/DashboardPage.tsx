import { useAuth } from "@features/auth/hooks/useAuth";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import {
  BookOpen,
  BookPlus,
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
  UserCog,
  Video,
} from "lucide-react";
import { ROUTES } from "@shared/constants/routes";
import {
  useGetAdminDashboardQuery,
  useGetTutorDashboardQuery,
} from "@features/dashboard/api/dashboardApi";
import { ActivityCard } from "@features/dashboard/components/ActivityCard";
import { QuickActionsCard, type QuickAction } from "@features/dashboard/components/QuickActionsCard";
import { StatTile } from "@features/dashboard/components/StatTile";
import { WelcomeHeader } from "@features/dashboard/components/WelcomeHeader";

/*
 * Colour families by subject, shared by the stat tiles and the quick actions
 * (and the analytics page), so "rooms" is teal wherever it shows up:
 * people → data (blue, dots), courses → res (pink, the book), anything waiting
 * for review → eng (orange, the gear: attention without the alarm red), rooms
 * and bookings → build (teal, the arch), enrolments → energy (green, waves).
 * The motifs are the ones the website draws for those families.
 */

export default function DashboardPage() {
  const { user } = useAuth();
  const { isTutor, isStaff } = usePermissions();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  // Tutors get the tutor counters; pure staff (admin/super without tutor role)
  // get the admin counters. Skip the call that doesn't apply to this role.
  const tutor = useGetTutorDashboardQuery(undefined, { skip: !isTutor });
  const admin = useGetAdminDashboardQuery(undefined, { skip: !isStaff || isTutor });

  const num = (n: number) => n.toLocaleString();

  // Without data (the request failed, or is retrying after a failure) a tile
  // shows a dash and no meta line: a "0", or "0 tutors pending", would say
  // there is nothing to act on.
  const tLoading = tutor.isLoading || (tutor.isFetching && !tutor.data);
  const aLoading = admin.isLoading || (admin.isFetching && !admin.data);
  const t = tutor.data;
  const a = admin.data;
  const NONE = "—";

  const tutorQuick: QuickAction[] = [
    { label: "Create new course", to: ROUTES.tutorCourseNew, Icon: BookPlus, hue: "k-res" },
    { label: "Upload lesson video", to: ROUTES.tutorVideos, Icon: Video, hue: "k-it" },
    { label: "Request a classroom", to: ROUTES.tutorRoomRequests, Icon: DoorOpen, hue: "k-build" },
    { label: "View enrollments", to: ROUTES.tutorEnrollments, Icon: Users, hue: "k-data" },
  ];
  const staffQuick: QuickAction[] = [
    { label: "Review pending tutors", to: ROUTES.adminTutors, Icon: UserCheck, hue: "k-data" },
    { label: "Approve room requests", to: ROUTES.adminRoomRequests, Icon: CalendarCheck, hue: "k-eng" },
    { label: "Add a new room", to: ROUTES.adminRooms, Icon: DoorOpen, hue: "k-build" },
    { label: "Open analytics", to: ROUTES.adminAnalytics, Icon: ChartColumn, hue: "k-energy" },
  ];
  const quick = isTutor ? tutorQuick : staffQuick;

  return (
    <>
      <WelcomeHeader
        title={`Welcome back, ${firstName}`}
        description="Here's a snapshot of what's happening across the portal today."
      />

      {/*
        One row of four compact tiles (two by two below xl), at the size of the
        Analytics page's stat row.
      */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isTutor && (
          <>
            <StatTile label="My courses" value={t ? num(t.courses) : NONE} delta={t ? `${num(t.publishedCourses)} published` : undefined} Icon={BookOpen} hue="k-res" motif="book" loading={tLoading} />
            <StatTile label="Enrolled students" value={t ? num(t.students) : NONE} Icon={Users} hue="k-data" motif="dots" loading={tLoading} />
            <StatTile label="Courses in review" value={t ? num(t.coursesInReview) : NONE} delta={t ? "awaiting approval" : undefined} Icon={ClipboardCheck} hue="k-eng" motif="gear" loading={tLoading} />
            <StatTile label="Approved bookings" value={t ? num(t.approvedBookings) : NONE} delta={t ? "classroom sessions" : undefined} Icon={GraduationCap} hue="k-build" motif="arch" loading={tLoading} />
          </>
        )}
        {isStaff && !isTutor && (
          <>
            <StatTile label="Total users" value={a ? num(a.totalUsers) : NONE} delta={a ? `${num(a.pendingTutorApprovals)} tutors pending` : undefined} Icon={UserCog} hue="k-data" motif="dots" loading={aLoading} />
            <StatTile label="Courses pending review" value={a ? num(a.pendingCourseReviews) : NONE} delta={a ? `${num(a.publishedCourses)} published` : undefined} Icon={BookOpen} hue="k-eng" motif="gear" loading={aLoading} />
            <StatTile label="Rooms" value={a ? num(a.totalRooms) : NONE} delta={a ? `${num(a.pendingRoomRequests)} requests pending` : undefined} Icon={DoorOpen} hue="k-build" motif="arch" loading={aLoading} />
            <StatTile label="Total enrollments" value={a ? num(a.totalEnrollments) : NONE} Icon={TrendingUp} hue="k-energy" motif="wave" loading={aLoading} />
          </>
        )}
      </div>

      {/*
        Quick actions lead (three fifths from xl, its rows two by two) and the
        activity card sits beside it at its own height. Below xl both run full
        width, actions first: on a phone the thing you can act on comes before
        the empty feed.
      */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <QuickActionsCard actions={quick} className="xl:col-span-3" />
        <ActivityCard className="xl:col-span-2" />
      </div>
    </>
  );
}
