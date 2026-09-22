import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useListVideosQuery } from "@features/videos/api/videosApi";

/**
 * Whether this account may use the streaming video endpoints (`/api/videos`),
 * the only way to upload a video larger than the 32 MB multipart cap.
 *
 * Tutors always may (`course:create`). Staff hold `course:create_any`, which
 * newer APIs also accept there; older ones answer 403. So for staff a one-row
 * list is tried once and cached, and until it answers the multipart limit is
 * assumed — promising 512 MB and failing at "init" would be worse than offering
 * less.
 */
export function useCanStreamVideo(): boolean {
  const { can } = usePermissions();
  const direct = can("course:create");
  const staff = !direct && can("course:create_any");
  const probe = useListVideosQuery({ size: 1 }, { skip: !staff });
  return direct || (staff && probe.isSuccess);
}
