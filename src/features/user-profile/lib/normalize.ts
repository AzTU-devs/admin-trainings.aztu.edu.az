import type { UserProfileDto } from "@features/user-profile/types";

const list = <T>(value: readonly T[] | null | undefined): T[] => (Array.isArray(value) ? [...value] : []);

/**
 * The profile with every list the contract promises made a real array.
 *
 * The contract says each list is always present, but the endpoint is new and
 * `expert.customExpertise` was added to it late: an API build that leaves one
 * out must still render the page rather than crash on `undefined.map`. Values
 * are otherwise passed through untouched.
 */
export function normalizeUserProfile(raw: UserProfileDto): UserProfileDto {
  const { account, expert, learner, activity } = raw;
  return {
    account: { ...account, roles: list(account.roles), identities: list(account.identities) },
    expert: expert
      ? {
          ...expert,
          expertise: list(expert.expertise),
          customExpertise: list(expert.customExpertise),
          approvalHistory: list(expert.approvalHistory),
          courses: list(expert.courses),
          roomBookings: list(expert.roomBookings),
          stats: expert.stats ?? { courseCount: 0, publishedCourseCount: 0, totalEnrolled: 0, distinctParticipants: 0 },
        }
      : null,
    learner: {
      enrollments: list(learner?.enrollments),
      orders: list(learner?.orders).map((o) => ({ ...o, items: list(o.items), payments: list(o.payments) })),
      reviews: list(learner?.reviews),
      stats: learner?.stats ?? { enrollmentCount: 0, activeCount: 0, completedCount: 0, averageProgress: 0 },
    },
    activity: {
      sessions: list(activity?.sessions),
      securityEvents: list(activity?.securityEvents),
      auditTrail: list(activity?.auditTrail),
    },
  };
}
