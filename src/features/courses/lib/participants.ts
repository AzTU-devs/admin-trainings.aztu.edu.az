import type { TutorRoster } from "@features/courses/components/TutorRosterPicker";
import type { AdminCreateCourseRequest, CreateCourseRequest } from "@features/courses/types";
import type { UUID } from "@shared/types/lms";

/*
 * The İştirakçilər picked on the admin create screen, and how they travel in
 * the create request (`participantUserIds`, contract E).
 */

/** The API's limit on `participantUserIds`. */
export const MAX_PARTICIPANTS = 500;

/** One picked person: the id is what is sent, the name and email are what the chip shows. */
export interface PickedParticipant {
  id: UUID;
  fullName: string;
  email: string;
}

/**
 * The list with `people` appended, skipping anyone already on it (or twice in
 * `people`) and stopping at `max`. Order is the order they were picked.
 */
export function addParticipants(
  list: PickedParticipant[],
  people: PickedParticipant[],
  max = MAX_PARTICIPANTS,
): PickedParticipant[] {
  const seen = new Set(list.map((p) => p.id));
  const next = [...list];
  for (const p of people) {
    if (next.length >= max) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    next.push(p);
  }
  return next.length === list.length ? list : next;
}

export function removeParticipant(list: PickedParticipant[], id: UUID): PickedParticipant[] {
  return list.filter((p) => p.id !== id);
}

/**
 * The admin create body. `participantUserIds` is only sent when someone was
 * picked (deduplicated, as the API would anyway), so a course created without
 * İştirakçilər sends exactly the body it always did.
 */
export function buildAdminCreateRequest(
  course: CreateCourseRequest,
  roster: Required<TutorRoster>,
  participants: PickedParticipant[],
): AdminCreateCourseRequest {
  const ids = [...new Set(participants.map((p) => p.id))];
  return {
    course,
    tutorIds: roster.tutorIds,
    authorizedTutorId: roster.authorizedTutorId,
    ...(ids.length ? { participantUserIds: ids } : {}),
  };
}

/**
 * Which picked person a USER_NOT_FOUND refers to. The API names the id in the
 * message; anything else (an older message) finds no one.
 */
export function participantNamedIn(
  message: string | undefined,
  participants: PickedParticipant[],
): PickedParticipant | null {
  if (!message) return null;
  const text = message.toLowerCase();
  return participants.find((p) => text.includes(p.id.toLowerCase())) ?? null;
}
