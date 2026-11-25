import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useParams } from "react-router";
import { Eye, Lock, MonitorPlay, SearchX } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Spinner } from "@shared/components/ui/Spinner";
import { isInPerson } from "@shared/types/lms";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useGetAdminCourseByIdQuery, useGetCourseBySlugQuery } from "@features/courses/api/coursesApi";
import { courseCrumb } from "@features/courses/lib/courseCrumb";
import type { CourseDto } from "@features/courses/types";
import {
  useGetAttendanceRegisterQuery,
  useGetCourseAttendanceQuery,
} from "@features/attendance/api/attendanceApi";
import { AttendanceDayCard } from "@features/attendance/components/AttendanceDayCard";
import { AttendanceRegisterCard } from "@features/attendance/components/AttendanceRegisterCard";
import { AttendanceRoster } from "@features/attendance/components/AttendanceRoster";
import { useBakuToday } from "@features/attendance/hooks/useBakuToday";
import { isMarkableDay } from "@features/attendance/lib/attendance";

/**
 * Where the page was opened from. An expert reaches it from their course
 * (`/tutor/courses/:id/attendance`, the course's slug, like the course page);
 * staff from the admin course page (`/admin/courses/:courseId/attendance`).
 */
type Scope = "tutor" | "admin";

/**
 * A course's attendance: the register — every student against every course
 * day — and under it one day's roster, where marks are taken. Choosing a day
 * in the register opens it there. Experts add marks (never change them);
 * admins read; a super admin adds, changes and deletes. The server decides who
 * may do what — the view's `canMark` and `canManage` — and this page only
 * follows it. Anyone who can see it can export the register to Excel.
 */
export default function CourseAttendancePage({ scope }: { scope: Scope }) {
  const params = useParams();
  const slug = scope === "tutor" ? params.id : undefined;
  const courseId = scope === "admin" ? params.courseId : undefined;
  const bySlug = useGetCourseBySlugQuery(slug ?? "", { skip: !slug });
  const byId = useGetAdminCourseByIdQuery(courseId ?? "", { skip: !courseId });
  const { data: course, isLoading, error } = scope === "tutor" ? bySlug : byId;

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !course) return <EmptyState tone="danger" Icon={SearchX} title="Course not found." />;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Who joined “${course.title}”, came late or was absent, day by day.`}
        // The course crumb names the course and leads back to its page.
        crumbLabel={courseCrumb(course.title)}
      />
      {isInPerson(course.courseType) ? (
        <AttendanceScreen course={course} scope={scope} />
      ) : (
        <EmptyState
          Icon={MonitorPlay}
          title="Online courses have no attendance"
          description="They are self-paced, so there are no class days to take attendance on."
        />
      )}
    </>
  );
}

function AttendanceScreen({ course, scope }: { course: CourseDto; scope: Scope }) {
  const [today, recheckToday] = useBakuToday();
  // Null until a day is picked: the API then shows today, clamped into the course's days.
  const [date, setDate] = useState<string | null>(null);
  const { data, currentData, error, isFetching, refetch } = useGetCourseAttendanceQuery(
    // Asked for again when the day turns in Baku with the page open, so the
    // list moves on to the new day rather than taking marks for the old one.
    date ? { courseId: course.id, date } : { courseId: course.id, today },
  );
  // The register card's own cache entry: only the course's weekdays are read here.
  const { data: register } = useGetAttendanceRegisterQuery(course.id);
  const daySectionRef = useRef<HTMLElement>(null);
  const dayHeadingRef = useRef<HTMLHeadingElement>(null);
  const dateBoxRef = useRef<HTMLInputElement>(null);

  if (!data) {
    if (error) return <AttendanceError error={error as NormalizedError} onRetry={() => void refetch()} />;
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  // The course's days and the caller's rights are the same on every day, so
  // they come from whichever day was loaded last; the list is the chosen day's
  // only (`currentData`), never the previous day's under the new date.
  const shown = date ?? data.date;
  // An API from before `canMark` leaves it to the route: an expert reaches
  // this page from their own courses, staff from the admin pages.
  const canAdd = data.canMark ?? (data.canManage || scope === "tutor");
  const oneDay = data.firstDate === data.lastDate;

  // The roster sits under the register: the reader is taken there, and its
  // heading — now naming the day chosen — takes the focus.
  const openDay = (day: string) => {
    flushSync(() => setDate(day));
    daySectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    dayHeadingRef.current?.focus({ preventScroll: true });
  };
  const openOtherDay = () => {
    daySectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    dateBoxRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-5">
      {!canAdd && (
        <div className="note">
          <Eye aria-hidden />
          <p>
            You can see attendance here. The course&rsquo;s experts take it, and only a super admin can change or delete a
            mark.
          </p>
        </div>
      )}

      <AttendanceRegisterCard
        courseId={course.id}
        courseSlug={course.slug}
        today={today}
        openDate={shown}
        onOpenDay={openDay}
        onOpenOtherDay={canAdd && !oneDay ? openOtherDay : undefined}
      />

      <section ref={daySectionRef} aria-label="The day's attendance" className="scroll-mt-24 space-y-5">
        <AttendanceDayCard
          date={shown}
          firstDate={data.firstDate}
          lastDate={data.lastDate}
          today={today}
          onPick={setDate}
          daysOfWeek={register?.daysOfWeek}
          headingRef={dayHeadingRef}
          dateBoxRef={dateBoxRef}
        />

        {currentData ? (
          <AttendanceRoster
            key={currentData.date}
            view={currentData}
            canAdd={canAdd && isMarkableDay(currentData.date, currentData.firstDate, currentData.lastDate, today)}
            today={today}
            recheckToday={recheckToday}
            refreshing={isFetching}
          />
        ) : error ? (
          <AttendanceError error={error as NormalizedError} onRetry={() => void refetch()} />
        ) : (
          <Card className="flex justify-center py-12" aria-busy>
            <Spinner />
            <span className="sr-only">Loading the day…</span>
          </Card>
        )}
      </section>
    </div>
  );
}

function AttendanceError({ error, onRetry }: { error: NormalizedError; onRetry: () => void }) {
  if (error.code === "ATTENDANCE_NOT_APPLICABLE") {
    return (
      <EmptyState
        Icon={MonitorPlay}
        title="Online courses have no attendance"
        description={error.message || "They are self-paced, so there are no class days to take attendance on."}
      />
    );
  }
  if (error.status === 403) {
    return (
      <EmptyState
        tone="warning"
        Icon={Lock}
        title="No access to this course's attendance"
        description={error.message || "Only the course's experts and the administrators can see it."}
      />
    );
  }
  return (
    <EmptyState
      tone="danger"
      title="Couldn't load attendance"
      description={error.message || "Please try again."}
      action={
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
