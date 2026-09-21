import { mediaContentUrl } from "@shared/api/mediaApi";
import { resolveApiUrl } from "@shared/config/env";
import { TUTOR_APPROVAL_STATUS } from "@shared/types/lms";
import type { TutorProfileDto } from "@features/tutors/types";

/**
 * Where the dashboard can load a tutor's saved photo from, or null for none.
 *
 * An approved tutor's photo is on the anonymous public route, which a plain
 * <img> can load and the browser can cache — no token, no detour through a blob.
 * Until approval that route is a 404 by design, so the photo is read through
 * the authenticated route instead, which staff, the uploader and the expert
 * themselves are all allowed to use.
 */
export function tutorAvatarSrc(
  t: Pick<TutorProfileDto, "avatarMediaId" | "avatarUrl" | "approvalStatus">,
): string | null {
  if (t.approvalStatus === TUTOR_APPROVAL_STATUS.APPROVED && t.avatarUrl) return resolveApiUrl(t.avatarUrl);
  return t.avatarMediaId ? mediaContentUrl(t.avatarMediaId) : null;
}
