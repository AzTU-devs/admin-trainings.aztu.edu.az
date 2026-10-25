import { Link } from "react-router";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  ListOrdered,
  MapPin,
  RotateCw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";
import { StatusBadge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { RichTextView } from "@shared/components/ui/RichTextView";
import { Spinner } from "@shared/components/ui/Spinner";
import { ROUTES } from "@shared/constants/routes";
import { COURSE_TYPE_LABEL } from "@shared/types/lms";
import { useGetAdminCourseByIdQuery } from "@features/courses/api/coursesApi";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { CoursePriceValue } from "@features/courses/components/courseCells";
import type { CourseDto } from "@features/courses/types";
import { useListCourseParticipantsQuery } from "@features/participants/api/participantsApi";
import { ViewProfileLink } from "@features/user-profile/components/ViewProfileLink";
import { KindBadge } from "@features/calendar/components/KindBadge";
import {
  PLATFORM_TIME_ZONE,
  formatEventWhen,
  placeOf,
  seatsText,
} from "@features/calendar/lib/calendarEvents";
import type { CalendarEventDto, CalendarEventKind } from "@features/calendar/types";

/** How many İştirakçilər the dialog lists before pointing at the full page. */
export const PARTICIPANT_PREVIEW = 5;
/** Syllabus topics shown before "and N more". */
const TOPIC_PREVIEW = 8;

const KIND_ICON: Record<CalendarEventKind, LucideIcon> = {
  ONE_TIME: CalendarClock,
  SESSION: CalendarDays,
  COURSE: CalendarRange,
  ROOM_BOOKING: DoorOpen,
};

interface Props {
  /** The entry that was clicked; null closes the dialog. */
  event: CalendarEventDto | null;
  onOpenChange: (open: boolean) => void;
  /** The zone the calendar shows (the API's `timezone`). */
  timeZone?: string;
}

/**
 * Everything about one calendar entry. What the calendar row itself carries
 * (time, place, tutors, seats, status) shows at once; for an entry that
 * belongs to a course the course and its first İştirakçilər are loaded on
 * open from the existing admin endpoints — the calendar has no detail
 * endpoint of its own.
 */
export function CalendarEventDialog({ event, onOpenChange, timeZone = PLATFORM_TIME_ZONE }: Props) {
  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      {event && <EventDetails event={event} timeZone={timeZone} />}
    </Dialog>
  );
}

function EventDetails({ event, timeZone }: { event: CalendarEventDto; timeZone: string }) {
  const Icon = KIND_ICON[event.kind] ?? CalendarDays;
  const courseId = event.courseId ?? null;
  const place = placeOf(event);
  const seats = seatsText(event);
  const tutors = (event.tutorNames ?? []).filter(Boolean);

  return (
    <DialogContent size="lg">
      <DialogHeader icon={<Icon />}>
        <DialogTitle className="break-words">{event.title}</DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={event.kind} />
            {event.courseStatus && <CourseStatusBadge status={event.courseStatus} />}
            {event.bookingStatus && <StatusBadge value={event.bookingStatus} />}
          </div>
        </DialogDescription>
      </DialogHeader>

      <dl className="divide-y divide-line rounded-[18px] border border-line text-[13.5px]">
        <Fact icon={<Clock />} label="When">
          <span>{formatEventWhen(event, timeZone)}</span>
          <span className="block text-[12px] font-normal text-ink-3">{timeZone} time</span>
        </Fact>
        <Fact icon={<MapPin />} label="Where">
          {place || <Muted>Not set</Muted>}
        </Fact>
        <Fact icon={<GraduationCap />} label={tutors.length === 1 ? "Tutor" : "Tutors"}>
          {tutors.length ? tutors.join(", ") : <Muted>None assigned</Muted>}
        </Fact>
        {seats && (
          <Fact icon={<Users />} label="Seats">
            <span className="tabular-nums">{seats}</span>
          </Fact>
        )}
      </dl>

      {courseId ? <CourseSection courseId={courseId} /> : null}

      <DialogFooter>
        {courseId ? (
          <>
            <Button asChild variant="secondary" leftIcon={<Users className="size-4" />}>
              <Link to={ROUTES.adminCourseParticipants(courseId)}>İştirakçilər</Link>
            </Button>
            <Button asChild leftIcon={<ExternalLink className="size-4" />}>
              <Link to={ROUTES.adminCourseEdit(courseId)}>Open course</Link>
            </Button>
          </>
        ) : (
          <Button asChild variant="secondary" leftIcon={<DoorOpen className="size-4" />}>
            <Link to={ROUTES.adminRoomRequests}>Booking requests</Link>
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

/* ───────────────────────────── course ───────────────────────────── */

function CourseSection({ courseId }: { courseId: string }) {
  const { data: course, isLoading, isError, refetch } = useGetAdminCourseByIdQuery(courseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-3" role="status">
        <Spinner size={4} /> Loading the course…
      </div>
    );
  }
  if (isError || !course) {
    return (
      <div
        className="mt-4 flex items-center justify-between gap-3 rounded-[18px] bg-danger-tint px-4 py-3 text-sm text-danger"
        role="alert"
      >
        Could not load the course.
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RotateCw className="size-4" />}
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }
  return <CourseDetails course={course} />;
}

function CourseDetails({ course }: { course: CourseDto }) {
  const off = course.offlineDetails;
  const topics = (course.syllabusItems ?? []).filter((t) => t.title?.trim());
  const dates = courseDates(course);

  return (
    <section aria-label="Course" className="mt-5 space-y-5">
      {course.subtitle?.trim() && (
        <p className="text-[14.5px] font-medium leading-relaxed text-ink">{course.subtitle}</p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px] sm:grid-cols-4">
        <Stat label="Type">{COURSE_TYPE_LABEL[course.courseType] ?? course.courseType}</Stat>
        <Stat label="Price">
          <CoursePriceValue free={course.free} price={course.price} currency={course.currency} />
        </Stat>
        <Stat label="Dates">{dates ?? <Muted>Not set</Muted>}</Stat>
        <Stat label="Enrolled">
          <span className="tabular-nums">
            {course.enrolledCount.toLocaleString()}
            {off?.studentLimit ? ` / ${off.studentLimit}` : ""}
          </span>
        </Stat>
      </dl>

      {course.description?.trim() && (
        <div>
          <SectionTitle>Description</SectionTitle>
          <div className="max-h-56 overflow-y-auto pr-1">
            <RichTextView value={course.description} />
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div>
          <SectionTitle icon={<ListOrdered />}>Syllabus</SectionTitle>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2 marker:text-ink-3">
            {topics.slice(0, TOPIC_PREVIEW).map((t, i) => (
              <li key={i}>{t.title}</li>
            ))}
          </ol>
          {topics.length > TOPIC_PREVIEW && (
            <p className="mt-1 text-[12.5px] text-ink-3">
              and {topics.length - TOPIC_PREVIEW} more
            </p>
          )}
        </div>
      )}

      <ParticipantsPreview courseId={course.id} />
    </section>
  );
}

/** "2 Nov 2026 – 4 Nov 2026, 10:00–12:00" from the course's own schedule, or null. */
function courseDates(course: CourseDto): string | null {
  const off = course.offlineDetails;
  if (!off?.startDate) return null;
  const day = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, dd, 12)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  const span =
    off.endDate && off.endDate !== off.startDate
      ? `${day(off.startDate)} – ${day(off.endDate)}`
      : day(off.startDate);
  const times =
    off.startTime && off.endTime ? `, ${off.startTime.slice(0, 5)}–${off.endTime.slice(0, 5)}` : "";
  return span + times;
}

function ParticipantsPreview({ courseId }: { courseId: string }) {
  const { data, isLoading, isError } = useListCourseParticipantsQuery({
    courseId,
    page: 0,
    size: PARTICIPANT_PREVIEW,
  });
  const rows = data?.content ?? [];
  const total = data?.totalElements ?? rows.length;

  return (
    <div>
      <SectionTitle icon={<Users />}>
        İştirakçilər
        {data ? (
          <span className="ml-1.5 font-semibold text-ink-3 tabular-nums">{total}</span>
        ) : null}
      </SectionTitle>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size={4} />
        </div>
      ) : isError ? (
        <p className="text-sm text-danger">Could not load the İştirakçilər.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-3">No İştirakçilər yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 py-2">
              <Avatar size="sm">
                <AvatarImage src={p.avatarUrl} alt="" />
                <AvatarFallback name={p.fullName} />
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.fullName}</p>
                <p className="truncate text-[12.5px] text-ink-3">{p.email}</p>
              </div>
              <ViewProfileLink userId={p.userId} />
            </li>
          ))}
        </ul>
      )}
      {total > rows.length && (
        <p className="mt-1 text-[12.5px] text-ink-3">
          and {total - rows.length} more on the İştirakçilər page
        </p>
      )}
    </div>
  );
}

/* ───────────────────────────── bits ───────────────────────────── */

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <dt className="flex w-24 shrink-0 items-center gap-2 text-ink-3 [&_svg]:size-4 [&_svg]:shrink-0">
        <span aria-hidden className="contents">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{children}</dd>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 font-display text-[15px] font-bold tracking-[-0.01em] text-ink [&_svg]:size-4 [&_svg]:text-ink-3">
      {icon ? (
        <span aria-hidden className="contents">
          {icon}
        </span>
      ) : null}
      {children}
    </h3>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-ink-3">{children}</span>;
}
