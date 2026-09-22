import { MapPin, MonitorPlay, Users } from "lucide-react";
import { CourseCover } from "@shared/components/bright";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { Badge } from "@shared/components/ui/Badge";
import { cn } from "@shared/lib/cn";
import { COURSE_LEVEL, COURSE_TYPE, type CourseLevel, type CourseStatus, type CourseType } from "@shared/types/lms";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";

/*
 * Presentational pieces shared by the course tables (admin list, tutor list,
 * approvals) and the editor's summary card. They only format what the row
 * already carries — no lookups, no requests.
 */

/**
 * The website's level meter: one, two or three rising bars, all three dimmed
 * for "all levels" (it says nothing about difficulty).
 */
const LEVEL_BARS: Record<CourseLevel, 0 | 1 | 2 | 3> = {
  [COURSE_LEVEL.BEGINNER]: 1,
  [COURSE_LEVEL.INTERMEDIATE]: 2,
  [COURSE_LEVEL.ADVANCED]: 3,
  [COURSE_LEVEL.ALL]: 0,
};

/*
 * Enum values ("ONLINE", "ALL") are shown as they arrive, but set in sentence
 * case by CSS: the text itself stays the value the API sent, so nothing that
 * reads the DOM sees a different word — only the shouting goes.
 */
const ENUM_TEXT = "inline-block lowercase first-letter:uppercase";

/** An enum value ("ONLINE", "BEGINNER") set in sentence case — see ENUM_TEXT. */
export function EnumText({ children, className }: { children: string; className?: string }) {
  return <span className={cn(ENUM_TEXT, className)}>{children}</span>;
}

/**
 * Phone layout for the course tables, passed as the DataTable's `className`.
 * Seven columns cannot share 390px, and a sideways-scrolling table hid the
 * status off the edge of the card. So on a phone only the first column is
 * drawn and the title cell carries the rest as a meta line (CourseTitleCell's
 * `meta`). The header row turns into a flex row of the first label and the
 * sort buttons, so the sortable columns can still be sorted on a phone.
 */
export const COURSE_TABLE_PHONE =
  "max-sm:[&_td:not(:first-child)]:hidden max-sm:[&_td:first-child]:pr-5 " +
  "max-sm:[&_th:not(:first-child):not(:has(button))]:hidden " +
  "max-sm:[&_thead_tr]:flex max-sm:[&_thead_tr]:items-center max-sm:[&_thead_tr]:gap-4 max-sm:[&_thead_tr]:pr-5 " +
  "max-sm:[&_th]:inline-flex max-sm:[&_th]:items-center " +
  "max-sm:[&_th:first-child]:mr-auto max-sm:[&_th:not(:first-child)]:px-0";

/**
 * Cover thumbnail + title, with the subtitle under it when the course has one.
 *
 * The list rows (CourseSummaryDto) carry no category — the API sends none —
 * so the thumbnail is the category-less cover, and the editor's side card
 * draws the same one: both take their shape from the same pick by course id
 * (brandVariant), so a row's shield opens onto a shield cover. 44px with a
 * 14px radius, as on Enrollments, so a course thumbnail is one size in every
 * table and sits level with the row's text rather than reading as an app icon.
 *
 * The second line is the subtitle, falling back to the slug (in mono, as
 * technical values are set) when a course has none, so a row never loses the
 * one line that tells two similar courses apart.
 *
 * `meta` is shown under the title on phones only, where the other columns are
 * hidden (see COURSE_TABLE_PHONE).
 */
export function CourseTitleCell({
  course,
  meta,
}: {
  course: { id: string; title: string; subtitle?: string | null; slug: string };
  meta?: React.ReactNode;
}) {
  const subtitle = course.subtitle?.trim();
  return (
    <div className="min-w-[13rem] sm:min-w-[15rem] sm:max-w-[26rem]" title={`${course.title}\n${course.slug}`}>
      <div className="flex items-center gap-3 sm:gap-3.5">
        <CourseCover seed={course.id} thumb className="size-11 shrink-0 rounded-[14px]" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words font-semibold leading-snug text-ink sm:line-clamp-1">
            {course.title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{subtitle}</p>
          ) : (
            <p className="mt-0.5 truncate font-mono text-[12px] text-ink-3">{course.slug}</p>
          )}
        </div>
      </div>
      {/* The full row width, under the cover too: indented under the title it
          wrapped to three lines on a phone. */}
      {meta ? <div className="meta mt-2.5 gap-y-2 text-[12.5px] sm:hidden">{meta}</div> : null}
    </div>
  );
}

/**
 * A tutor's name with their hue avatar. The colour comes from the name, as the
 * shared Avatar does everywhere, so a tutor is the same colour on every page.
 */
export function TutorCell({ name }: { name?: string | null }) {
  if (!name) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex max-w-[14rem] items-center gap-2.5">
      <Avatar size="xs">
        <AvatarFallback name={name} />
      </Avatar>
      <span className="truncate text-ink-2">{name}</span>
    </span>
  );
}

/** "Online" with a screen, "Offline" with a pin — as on the website's cards. */
export function CourseTypeValue({ type, className }: { type: CourseType; className?: string }) {
  const Icon = type === COURSE_TYPE.OFFLINE ? MapPin : MonitorPlay;
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />
      <EnumText>{type}</EnumText>
    </span>
  );
}

export function CourseLevelValue({ level, className }: { level: CourseLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span className="lvl text-navy" data-l={LEVEL_BARS[level] ?? 0} aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <EnumText>{level}</EnumText>
    </span>
  );
}

export function CoursePriceValue({
  free,
  price,
  currency,
}: {
  free: boolean;
  price: number;
  currency: string;
}) {
  if (free) return <Badge tone="success">Free</Badge>;
  return (
    <span className="whitespace-nowrap font-semibold text-ink tabular-nums">
      {price} <span className="font-medium text-ink-3">{currency}</span>
    </span>
  );
}

/**
 * What the hidden columns of a course list say, as one meta line under the
 * title on a phone (see COURSE_TABLE_PHONE): status first, since it is what a
 * list is scanned for, then the values the desktop columns show, in order.
 */
export function CourseRowMeta({
  course,
  showTutor,
}: {
  course: {
    status: CourseStatus;
    courseType: CourseType;
    level: CourseLevel;
    enrolledCount: number;
    free: boolean;
    price: number;
    currency: string;
    tutorDisplayName?: string | null;
  };
  showTutor?: boolean;
}) {
  return (
    <>
      <CourseStatusBadge status={course.status} />
      <CourseTypeValue type={course.courseType} />
      <CourseLevelValue level={course.level} />
      <span>
        <Users aria-hidden />
        <span className="tabular-nums">{course.enrolledCount.toLocaleString()}</span>
      </span>
      <CoursePriceValue free={course.free} price={course.price} currency={course.currency} />
      {showTutor && course.tutorDisplayName ? <TutorCell name={course.tutorDisplayName} /> : null}
    </>
  );
}
