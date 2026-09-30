import type { ColumnDef } from "@tanstack/react-table";
import {
  BookOpen,
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  DoorOpen,
  GraduationCap,
  History,
  Link2,
  Star,
  Tags,
  Users,
} from "lucide-react";
import { CourseCover, SoftEmpty } from "@shared/components/bright";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import { categoryStyle } from "@shared/lib/categoryStyle";
import { cn } from "@shared/lib/cn";
import { FormCard } from "@features/courses/components/FormCard";
import {
  CourseLink,
  Detail,
  DetailList,
  Notice,
  PlainText,
  ProfileSection,
  SafeLink,
  Value,
} from "@features/user-profile/components/ProfileBits";
import {
  ApprovalStatusPill,
  BookingStatusPill,
  CourseStatusPill,
} from "@features/user-profile/components/StatusPills";
import {
  courseTypeLabel,
  formatCount,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRange,
  formatRating,
  lines,
  orcidHref,
  safeExternalUrl,
} from "@features/user-profile/lib/format";
import type {
  ProfileApprovalEntry,
  ProfileExpert,
  ProfileRoomBooking,
  ProfileTaughtCourse,
} from "@features/user-profile/types";

/** Stars and count, as the Tutors table shows a rating; a dash before the first one. */
function RatingValue({ avg, count }: { avg: number; count: number }) {
  if (!count) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Star aria-hidden className="size-3.5 fill-gold text-gold" />
      <span className="font-semibold text-ink tabular-nums">{formatRating(avg)}</span>
      <span className="text-ink-3 tabular-nums">({count.toLocaleString()})</span>
    </span>
  );
}

function RosterRole({ editor }: { editor: boolean }) {
  // The roster picker's words: the one who may edit is the "Editor" (gold there too).
  return editor ? (
    <Badge tone="gold" size="sm">
      Editor
    </Badge>
  ) : (
    <Badge tone="neutral" size="sm">
      Tutor
    </Badge>
  );
}

const COURSE_COLUMNS: ColumnDef<ProfileTaughtCourse>[] = [
  {
    header: "Course",
    cell: ({ row }) => (
      <div className="flex min-w-[14rem] max-w-[26rem] items-center gap-3">
        <CourseCover seed={row.original.id} thumb className="size-11 shrink-0 rounded-[14px]" />
        <div className="min-w-0">
          <CourseLink course={row.original} className="line-clamp-2" />
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-3">{row.original.slug}</p>
        </div>
      </div>
    ),
  },
  { header: "Type", cell: ({ row }) => <span className="whitespace-nowrap">{courseTypeLabel(row.original.courseType)}</span> },
  { header: "Status", cell: ({ row }) => <CourseStatusPill status={row.original.status} /> },
  { header: "Roster", cell: ({ row }) => <RosterRole editor={row.original.editor} /> },
  {
    header: "Enrolled",
    meta: { align: "right" },
    cell: ({ row }) => <span className="font-medium text-ink">{formatCount(row.original.enrolledCount)}</span>,
  },
  {
    header: "Rating",
    cell: ({ row }) => <RatingValue avg={row.original.ratingAvg} count={row.original.ratingCount} />,
  },
  {
    header: "Published",
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.publishedAt)}</span>,
  },
  {
    header: "Created",
    meta: { hideBelow: "xl" },
    cell: ({ row }) => <span className="whitespace-nowrap text-ink-3">{formatDate(row.original.createdAt)}</span>,
  },
];

function CoursePhoneRow({ course: c }: { course: ProfileTaughtCourse }) {
  return (
    <div className="text-sm text-ink-2">
      <div className="flex items-start gap-3">
        <CourseCover seed={c.id} thumb className="size-11 shrink-0 rounded-[14px]" />
        <div className="min-w-0 flex-1">
          <CourseLink course={c} />
          <p className="mt-0.5 truncate font-mono text-[12px] text-ink-3">{c.slug}</p>
        </div>
      </div>
      <div className="meta mt-2.5 gap-y-2 text-[12.5px]">
        <CourseStatusPill status={c.status} />
        <span>{courseTypeLabel(c.courseType)}</span>
        <RosterRole editor={c.editor} />
        <span>
          <Users aria-hidden />
          <span className="tabular-nums">{formatCount(c.enrolledCount)}</span>
        </span>
        <RatingValue avg={c.ratingAvg} count={c.ratingCount} />
        <span>Published {formatDate(c.publishedAt)}</span>
        <span>Created {formatDate(c.createdAt)}</span>
      </div>
    </div>
  );
}

const BOOKING_COLUMNS: ColumnDef<ProfileRoomBooking>[] = [
  {
    header: "Room",
    cell: ({ row }) => (
      <span className="flex min-w-[10rem] max-w-[20rem] items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-paper-2 text-ink-3">
          <DoorOpen className="size-[18px]" />
        </span>
        <span className="min-w-0 break-words font-medium leading-snug text-ink">{row.original.roomName}</span>
      </span>
    ),
  },
  {
    header: "When",
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">{formatRange(row.original.startsAt, row.original.endsAt)}</span>
    ),
  },
  { header: "Status", cell: ({ row }) => <BookingStatusPill status={row.original.status} /> },
  {
    header: "Fee",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-semibold text-ink tabular-nums">
        {formatMoney(row.original.totalFee, row.original.currency)}
      </span>
    ),
  },
];

function BookingPhoneRow({ booking: b }: { booking: ProfileRoomBooking }) {
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words font-semibold leading-snug text-ink">{b.roomName}</p>
        <span className="shrink-0 font-semibold text-ink tabular-nums">{formatMoney(b.totalFee, b.currency)}</span>
      </div>
      <div className="meta mt-2 text-[12.5px]">
        <BookingStatusPill status={b.status} />
        <span className="max-w-full whitespace-normal tabular-nums">
          <Clock aria-hidden />
          {formatRange(b.startsAt, b.endsAt)}
        </span>
      </div>
    </div>
  );
}

/** One application and its decision, as a step on a vertical rail. */
function ApprovalStep({ entry: h, last }: { entry: ProfileApprovalEntry; last: boolean }) {
  const Icon = h.status === "APPROVED" ? CircleCheck : h.status === "REJECTED" ? CircleX : Clock;
  const tile =
    h.status === "APPROVED"
      ? "bg-ok-tint text-ok"
      : h.status === "REJECTED"
        ? "bg-danger-tint text-danger"
        : "bg-warn-tint text-warn";
  return (
    <li className={cn("relative flex gap-4", !last && "pb-6")}>
      {!last && <span aria-hidden className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-line" />}
      <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full", tile)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ApprovalStatusPill status={h.status} />
          <span className="text-[13px] text-ink-3">Submitted {formatDateTime(h.submittedAt)}</span>
        </div>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          {h.decidedAt ? (
            <>
              Decided {formatDateTime(h.decidedAt)}
              {h.decidedByName && (
                <>
                  {" "}
                  by <span className="font-semibold text-ink">{h.decidedByName}</span>
                </>
              )}
            </>
          ) : (
            "No decision yet"
          )}
        </p>
        {h.decisionNote?.trim() && (
          <blockquote className="mt-2 whitespace-pre-line break-words rounded-[14px] bg-paper-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
            {h.decisionNote.trim()}
          </blockquote>
        )}
      </div>
    </li>
  );
}

/** Qualifications typed one per line, shown as a list; a dash when there are none. */
function LineList({ value }: { value: string | null }) {
  const items = lines(value);
  if (items.length === 0) return <Value />;
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-ink-4">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

/**
 * The expert side of the account: the public profile as the expert filled it
 * in, the approval story, the courses on their roster and their room bookings.
 */
export function ExpertTab({ expert }: { expert: ProfileExpert }) {
  const links: Array<{ label: string; raw: string | null; href: string | null }> = [
    { label: "Website", raw: expert.websiteUrl, href: safeExternalUrl(expert.websiteUrl) },
    { label: "LinkedIn", raw: expert.linkedinUrl, href: safeExternalUrl(expert.linkedinUrl) },
    { label: "Google Scholar", raw: expert.googleScholarUrl, href: safeExternalUrl(expert.googleScholarUrl) },
    { label: "ResearchGate", raw: expert.researchGateUrl, href: safeExternalUrl(expert.researchGateUrl) },
    { label: "ORCID", raw: expert.orcid, href: orcidHref(expert.orcid) },
    { label: "GitHub", raw: expert.githubUrl, href: safeExternalUrl(expert.githubUrl) },
  ];
  const hasAreas = expert.expertise.length > 0 || expert.customExpertise.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <FormCard
          icon={<GraduationCap />}
          title="Expert profile"
          description="What the public expert page shows while the profile is approved."
          grid={false}
        >
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-3">
            <ApprovalStatusPill status={expert.approvalStatus} />
            {expert.approvedAt && <span>Approved {formatDate(expert.approvedAt)}</span>}
            {expert.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                Rated <RatingValue avg={expert.ratingAvg} count={expert.ratingCount} />
              </span>
            ) : (
              <span>No ratings yet</span>
            )}
          </div>
          {expert.rejectionReason?.trim() && (
            <div className="mb-5">
              <Notice tone="danger" Icon={CircleX} title="Rejection reason">
                <PlainText value={expert.rejectionReason} />
              </Notice>
            </div>
          )}
          <DetailList>
            <Detail label="Display name">
              <Value>{expert.displayName}</Value>
            </Detail>
            <Detail label="Academic title">
              <Value>{expert.academicTitle}</Value>
            </Detail>
            <Detail label="Headline" wide>
              <Value>{expert.headline}</Value>
            </Detail>
            <Detail label="Department">
              <Value>{expert.department}</Value>
            </Detail>
            <Detail label="Years of experience">
              <Value>
                {expert.yearsExperience != null &&
                  `${expert.yearsExperience} year${expert.yearsExperience === 1 ? "" : "s"}`}
              </Value>
            </Detail>
            <Detail label="Languages" wide>
              <Value>{expert.languages}</Value>
            </Detail>
            <Detail label="Education" wide>
              <LineList value={expert.education} />
            </Detail>
            <Detail label="Certifications" wide>
              <LineList value={expert.certifications} />
            </Detail>
            <Detail label="About" wide>
              <PlainText value={expert.bio} />
            </Detail>
          </DetailList>
        </FormCard>

        <div className="space-y-5">
          <FormCard icon={<Tags />} title="Areas of expertise" grid={false}>
            {hasAreas ? (
              <>
                <ul aria-label="Areas of expertise" className="flex flex-wrap gap-1.5">
                  {expert.expertise.map((area) => (
                    <li key={area.id}>
                      {/* A catalogue category, in its own colour as the category picker shows it. */}
                      <Badge tone="hue" className={cn("h-7 gap-1.5 pl-2 pr-2.5", categoryStyle({ name: area.name }).k)}>
                        <span aria-hidden className="size-2 shrink-0 rounded-[3px] bg-k-500" />
                        {area.name}
                      </Badge>
                    </li>
                  ))}
                  {expert.customExpertise.map((area, i) => (
                    <li key={`own-${i}-${area}`}>
                      {/* The expert's own words: outlined, beside the catalogue's. */}
                      <Badge tone="outline" className="h-7 px-2.5">
                        {area}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {expert.customExpertise.length > 0 && (
                  <p className="mt-3 text-[12.5px] text-ink-3">Outlined areas were added by the expert in their own words.</p>
                )}
              </>
            ) : (
              <SoftEmpty icon={<Tags />} title="No areas of expertise." />
            )}
          </FormCard>

          <FormCard icon={<Link2 />} title="Links" grid={false}>
            <DetailList single>
              {links.map((l) => (
                <Detail key={l.label} label={l.label}>
                  <SafeLink href={l.href} text={l.raw} />
                </Detail>
              ))}
            </DetailList>
          </FormCard>
        </div>
      </div>

      <ProfileSection title="Approval history" count={expert.approvalHistory.length}>
        {expert.approvalHistory.length === 0 ? (
          <SoftEmpty icon={<History />} title="No applications on record." />
        ) : (
          <ol className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            {expert.approvalHistory.map((entry, i) => (
              <ApprovalStep key={entry.id} entry={entry} last={i === expert.approvalHistory.length - 1} />
            ))}
          </ol>
        )}
      </ProfileSection>

      <ProfileSection
        title="Courses taught"
        count={expert.courses.length}
        description="Every course with this expert on its roster; the editor may change the course."
      >
        {expert.courses.length === 0 ? (
          <SoftEmpty icon={<BookOpen />} title="Not on any course roster." />
        ) : (
          <DataTable<ProfileTaughtCourse>
            data={expert.courses}
            columns={COURSE_COLUMNS}
            getRowId={(c) => c.id}
            renderMobileRow={(c) => <CoursePhoneRow course={c} />}
          />
        )}
      </ProfileSection>

      <ProfileSection title="Room bookings" count={expert.roomBookings.length}>
        {expert.roomBookings.length === 0 ? (
          <SoftEmpty icon={<CalendarClock />} title="No room bookings." />
        ) : (
          <DataTable<ProfileRoomBooking>
            data={expert.roomBookings}
            columns={BOOKING_COLUMNS}
            getRowId={(b) => b.id}
            renderMobileRow={(b) => <BookingPhoneRow booking={b} />}
          />
        )}
      </ProfileSection>
    </div>
  );
}
