import { StatusBadge } from "@shared/components/ui/Badge";
import {
  BOOKING_STATUS,
  COURSE_STATUS,
  TUTOR_APPROVAL_STATUS,
  type BookingStatus,
  type CourseStatus,
  type TutorApprovalStatus,
} from "@shared/types/lms";
import { CourseStatusBadge } from "@features/courses/components/CourseStatusBadge";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";

/*
 * The status pills the course, tutor and booking screens already use, so a
 * status looks the same here as there. Those look their value up in a fixed
 * map; a value this build does not know yet falls back to the shared pill
 * instead of taking the whole profile page down.
 */

const isOneOf = (values: Record<string, string>, value: string) => Object.values(values).includes(value);

export function CourseStatusPill({ status }: { status: string }) {
  return isOneOf(COURSE_STATUS, status) ? (
    <CourseStatusBadge status={status as CourseStatus} />
  ) : (
    <StatusBadge value={status} />
  );
}

export function ApprovalStatusPill({ status }: { status: string }) {
  return isOneOf(TUTOR_APPROVAL_STATUS, status) ? (
    <TutorStatusBadge status={status as TutorApprovalStatus} />
  ) : (
    <StatusBadge value={status} />
  );
}

export function BookingStatusPill({ status }: { status: string }) {
  return isOneOf(BOOKING_STATUS, status) ? (
    <RoomRequestStatusBadge status={status as BookingStatus} />
  ) : (
    <StatusBadge value={status} />
  );
}
