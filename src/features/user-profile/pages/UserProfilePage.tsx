import { useState } from "react";
import { Link, useParams } from "react-router";
import { RefreshCw, ShieldOff, TriangleAlert, UserRoundX } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { ROUTES } from "@shared/constants/routes";
import { useGetUserProfileQuery } from "@features/user-profile/api/userProfileApi";
import { ProfileHeader } from "@features/user-profile/components/ProfileHeader";
import { OverviewTab } from "@features/user-profile/components/OverviewTab";
import { ExpertTab } from "@features/user-profile/components/ExpertTab";
import { LearningTab } from "@features/user-profile/components/LearningTab";
import { ActivityTab } from "@features/user-profile/components/ActivityTab";
import { displayNameOf } from "@features/user-profile/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TabKey = "overview" | "expert" | "learning" | "activity";

const TITLE = "User profile";
const DESCRIPTION = "Everything the platform holds about this account, for inspection.";

/** The HTTP status of a failed query (NormalizedError), if it has one. */
function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function messageOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("message" in error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

/**
 * A super admin's deep view of one account (`/super/users/:userId`): who the
 * person is, then everything the platform holds about them in tabs — the
 * account, their expert side, their İştirakçi side, and their sessions,
 * security events and audit trail. Read only. Tabs with nothing in them for
 * this person are left out.
 */
export default function UserProfilePage() {
  const { userId = "" } = useParams();
  const valid = UUID.test(userId);
  const { data, error, isLoading, isFetching, refetch } = useGetUserProfileQuery(userId, {
    skip: !valid,
    // An inspection page shows the account as it is now, not as it was cached
    // on an earlier visit.
    refetchOnMountOrArgChange: true,
  });
  const [tab, setTab] = useState<TabKey>("overview");
  const status = statusOf(error);

  // A malformed id is refused before any request; the API answers 404 for an
  // unknown one (and 400 for an id it cannot parse).
  if (!valid || status === 404 || status === 400) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <EmptyState
          Icon={UserRoundX}
          title="User not found"
          description="No account has this id. The link may be mistyped, or out of date."
          action={
            <Button asChild variant="secondary">
              <Link to={ROUTES.adminUsers}>Back to users</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (!data) {
    if (isLoading || isFetching) {
      return (
        <>
          <PageHeader title={TITLE} description={DESCRIPTION} />
          <div className="flex justify-center py-16">
            <Spinner />
            <span className="sr-only">Loading profile…</span>
          </div>
        </>
      );
    }
    const forbidden = status === 403;
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <EmptyState
          tone="danger"
          Icon={forbidden ? ShieldOff : TriangleAlert}
          title={forbidden ? "No access to this profile" : "Couldn't load this profile"}
          description={
            forbidden
              ? "Inspecting an account needs the user:inspect permission, which only super admins hold."
              : messageOf(error) || "Please try again in a moment."
          }
          action={forbidden ? undefined : <Button onClick={() => void refetch()}>Try again</Button>}
        />
      </>
    );
  }

  const { account, expert, learner, activity } = data;
  const name = displayNameOf(account);
  const hasLearning = learner.enrollments.length > 0 || learner.orders.length > 0 || learner.reviews.length > 0;
  const hasActivity =
    activity.sessions.length > 0 || activity.securityEvents.length > 0 || activity.auditTrail.length > 0;
  // A participant's numbers are worth showing even at zero ("never enrolled");
  // a staff account with no learning at all would only show four zeros.
  const showLearnerStats = hasLearning || account.roles.includes("USER");

  const available: TabKey[] = ["overview"];
  if (expert) available.push("expert");
  if (hasLearning) available.push("learning");
  if (hasActivity) available.push("activity");
  const current = available.includes(tab) ? tab : "overview";

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        crumbLabel={name}
        documentTitle={`${name} · ${TITLE} · AzTU Portal`}
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="size-4" />}
            loading={isFetching}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        }
      />

      <ProfileHeader profile={data} />

      <Tabs value={current} onValueChange={(v) => setTab(v as TabKey)} className="mt-8">
        <TabsList aria-label="Profile sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {expert && <TabsTrigger value="expert">Expert</TabsTrigger>}
          {hasLearning && <TabsTrigger value="learning">Learning</TabsTrigger>}
          {hasActivity && <TabsTrigger value="activity">Activity &amp; security</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab profile={data} showLearner={showLearnerStats} />
        </TabsContent>
        {expert && (
          <TabsContent value="expert">
            <ExpertTab expert={expert} />
          </TabsContent>
        )}
        {hasLearning && (
          <TabsContent value="learning">
            <LearningTab learner={learner} />
          </TabsContent>
        )}
        {hasActivity && (
          <TabsContent value="activity">
            <ActivityTab activity={activity} userId={account.id} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
