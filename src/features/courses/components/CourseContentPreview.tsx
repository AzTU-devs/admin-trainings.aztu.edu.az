import { CalendarClock, CalendarDays, MapPin, Users } from "lucide-react";
import { RichTextView } from "@shared/components/ui/RichTextView";
import { isRichTextEmpty } from "@shared/lib/richText";
import { COURSE_TYPE, COURSE_TYPE_LABEL, isInPerson } from "@shared/types/lms";
import type { CourseDto } from "@features/courses/types";

/**
 * A course's written content as participants will read it — description,
 * requirements, outcomes, syllabus and, for an in-person course, when and where
 * — for the people who review it before it is published. Sections with nothing
 * in them are left out.
 */
export function CourseContentPreview({ course }: { course: CourseDto }) {
  const items = course.syllabusItems ?? [];
  const off = course.offlineDetails;

  return (
    <div className="space-y-5">
      {isInPerson(course.courseType) && off && (
        <dl className="grid gap-2.5 rounded-[18px] bg-paper-2 px-5 py-4 text-sm text-ink-2 sm:grid-cols-2">
          <Fact icon={course.courseType === COURSE_TYPE.ONE_TIME ? <CalendarClock /> : <CalendarDays />} label={COURSE_TYPE_LABEL[course.courseType]}>
            {scheduleText(course)}
          </Fact>
          {off.studentLimit ? (
            <Fact icon={<Users />} label="Seats">
              {off.enrolledCount ?? 0} / {off.studentLimit} taken
            </Fact>
          ) : null}
          {(off.city || off.addressLine) && (
            <Fact icon={<MapPin />} label="Place" wide>
              {[off.addressLine, off.city].filter(Boolean).join(", ")}
            </Fact>
          )}
        </dl>
      )}

      <Section title="Description" value={course.description} />
      <Section title="Requirements" value={course.requirements} />
      <Section title="Learning outcomes" value={course.learningOutcomes} />

      {items.length > 0 ? (
        <section>
          <SectionTitle>Syllabus</SectionTitle>
          <ol className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-navy-tint font-mono text-[11.5px] font-semibold text-navy">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  {!isRichTextEmpty(item.description) && (
                    <RichTextView value={item.description} className="mt-1" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <Section title="Syllabus" value={course.syllabus} />
      )}
    </div>
  );
}

/** "12 Oct 2026, 10:00–13:30" for a one-time course; a date range otherwise. */
function scheduleText(course: CourseDto): string {
  const off = course.offlineDetails;
  if (!off?.startDate) return "Not scheduled yet";
  const date = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const times =
    off.startTime && off.endTime ? `${off.startTime.slice(0, 5)}–${off.endTime.slice(0, 5)}` : null;
  if (course.courseType === COURSE_TYPE.ONE_TIME || !off.endDate || off.endDate === off.startDate) {
    return [date(off.startDate), times].filter(Boolean).join(", ");
  }
  return `${date(off.startDate)} – ${date(off.endDate)}${times ? `, ${times}` : ""}`;
}

function Section({ title, value }: { title: string; value?: string | null }) {
  if (isRichTextEmpty(value)) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <RichTextView value={value} />
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{children}</h3>
  );
}

function Fact({
  icon,
  label,
  wide,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "flex items-start gap-2.5 sm:col-span-2" : "flex items-start gap-2.5"}>
      <span aria-hidden className="mt-0.5 text-ink-3 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[12px] font-semibold text-ink-3">{label}</dt>
        <dd className="break-words text-ink">{children}</dd>
      </div>
    </div>
  );
}
