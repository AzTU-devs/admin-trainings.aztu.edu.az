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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@shared/lib/cn";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isTutor, isStaff } = usePermissions();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

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
            <StatCard label="My courses" value="12" delta="+2 this month" Icon={BookOpen} accent="brand" />
            <StatCard label="Enrolled students" value="284" delta="+18 this week" Icon={Users} accent="gold" />
            <StatCard label="Pending approvals" value="3" delta="awaiting review" Icon={ClipboardCheck} accent="warning" />
            <StatCard label="Upcoming sessions" value="7" delta="next 7 days" Icon={GraduationCap} accent="success" />
          </>
        )}
        {isStaff && !isTutor && (
          <>
            <StatCard label="Active tutors" value="86" delta="+4 this month" Icon={GraduationCap} accent="brand" />
            <StatCard label="Courses pending moderation" value="11" delta="awaiting review" Icon={BookOpen} accent="warning" />
            <StatCard label="Rooms in use" value="42 / 60" delta="70% utilization" Icon={DoorOpen} accent="gold" />
            <StatCard label="Monthly enrollments" value="1,248" delta="+12% MoM" Icon={TrendingUp} accent="success" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2" title="Recent activity" description="Latest events across your scope">
          <EmptyHint message="Activity timeline will populate once you start using the portal." />
        </Panel>
        <Panel title="Quick actions" description="Common tasks">
          <ul className="space-y-2">
            {(isTutor ? TUTOR_QUICK : STAFF_QUICK).map((q) => (
              <li key={q.label}>
                <button className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800">
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

const TUTOR_QUICK = [
  { label: "Create new course" },
  { label: "Upload lesson video" },
  { label: "Request a classroom" },
  { label: "View enrollments" },
];
const STAFF_QUICK = [
  { label: "Review pending tutors" },
  { label: "Approve room requests" },
  { label: "Add a new room" },
  { label: "Open analytics" },
];

type Accent = "brand" | "gold" | "warning" | "success";

function StatCard({
  label,
  value,
  delta,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  Icon: LucideIcon;
  accent: Accent;
}) {
  const accents: Record<Accent, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
    gold: "bg-aztu-gold-100 text-aztu-gold-700 dark:bg-aztu-gold-500/10 dark:text-aztu-gold-300",
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
    success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  };
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={cn("size-10 rounded-xl inline-flex items-center justify-center", accents[accent])}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {delta && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{delta}</p>}
    </div>
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
