import { Languages, Layers, MapPin, MonitorPlay, Users, Wallet } from "lucide-react";
import { CourseCover } from "@shared/components/bright";
import { Card } from "@shared/components/ui/Card";
import { MediaImage } from "@shared/components/ui/MediaImage";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { COURSE_TYPE } from "@shared/types/lms";
import { useCourseCategories } from "@features/courses/hooks/useCourseCategories";
import {
  CourseLevelValue,
  CoursePriceValue,
  CourseTypeValue,
  EnumText,
} from "@features/courses/components/courseCells";
import type { CourseDto } from "@features/courses/types";

/**
 * The editor's side card: the course's cover (its photo, or the generated
 * drawing) and its key facts, like the enrol card beside a course on the
 * website. On narrower screens it collapses to a row above the form: a small
 * cover and the facts as one meta line.
 *
 * The drawing is deliberately the category-less one. The course lists draw
 * their thumbnails from CourseSummaryDto, which carries no categories (the API
 * sends none), so a category-coloured cover here would make a course one
 * drawing in the list and another on its own page. Without a category both
 * take the same shape, picked by course id, so the list thumbnail is this
 * cover's motif. The categories still show, in their colours, as the labels
 * under the cover.
 */
export function CourseSummaryCard({ course, className }: { course: CourseDto; className?: string }) {
  const categories = useCourseCategories(course.categoryIds);
  const TypeIcon = course.courseType === COURSE_TYPE.OFFLINE ? MapPin : MonitorPlay;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex gap-4 p-3 sm:p-4 xl:block xl:p-0">
        <CourseCover
          seed={course.id}
          photo={!!course.thumbnailMediaId}
          className="aspect-[16/10] w-28 rounded-[14px] sm:w-44 sm:rounded-[16px] xl:w-full xl:rounded-none"
        >
          {course.thumbnailMediaId ? (
            <MediaImage mediaId={course.thumbnailMediaId} className="absolute inset-0 size-full object-cover" />
          ) : null}
          <div className="ov left-3 top-3 hidden xl:block">
            <span className="pill pill-glass">
              <TypeIcon aria-hidden />
              <EnumText>{course.courseType}</EnumText>
            </span>
          </div>
        </CourseCover>

        <div className="min-w-0 flex-1 xl:px-6 xl:pb-6 xl:pt-5">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {categories.map((c) => (
                <span key={c.id} className={cn("cat-label", categoryStyle(c).k)}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
          <p className={cn("truncate font-mono text-[12px] text-ink-3", categories.length > 0 && "mt-2")}>
            {course.slug}
          </p>

          {/* Narrow screens: one meta line beside the small cover. */}
          <div className="meta mt-2.5 xl:hidden">
            <CourseTypeValue type={course.courseType} />
            <CourseLevelValue level={course.level} />
            <span>
              <Users aria-hidden />
              <span className="tabular-nums">{course.enrolledCount.toLocaleString()}</span>
            </span>
            <CoursePriceValue free={course.free} price={course.price} currency={course.currency} />
          </div>

          {/* Wide screens: label / value rows, like the website's enrol card. */}
          <dl className="mt-4 hidden border-t border-line text-[13.5px] xl:block">
            <Fact icon={<TypeIcon />} label="Type">
              <EnumText>{course.courseType}</EnumText>
            </Fact>
            <Fact icon={<Layers />} label="Level">
              <CourseLevelValue level={course.level} />
            </Fact>
            <Fact icon={<Languages />} label="Language">
              <span className="font-mono text-[12.5px]">{course.language}</span>
            </Fact>
            <Fact icon={<Users />} label="Enrolled">
              <span className="tabular-nums">{course.enrolledCount.toLocaleString()}</span>
            </Fact>
            <Fact icon={<Wallet />} label="Price">
              <CoursePriceValue free={course.free} price={course.price} currency={course.currency} />
            </Fact>
          </dl>
        </div>
      </div>
    </Card>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-2.5 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2.5 text-ink-3 [&_svg]:size-4 [&_svg]:shrink-0">
        <span aria-hidden className="contents">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}
