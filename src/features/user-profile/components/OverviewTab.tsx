import {
  BookCheck,
  BookOpen,
  CircleCheckBig,
  ClipboardCheck,
  Gauge,
  Globe,
  KeyRound,
  PlayCircle,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "@shared/components/data-display/StatCard";
import { Kicker, SoftEmpty } from "@shared/components/bright";
import { Badge } from "@shared/components/ui/Badge";
import type { HueClass } from "@shared/lib/categoryStyle";
import { FormCard } from "@features/courses/components/FormCard";
import { Detail, DetailList, Value } from "@features/user-profile/components/ProfileBits";
import {
  formatCount,
  formatDate,
  formatDateTime,
  formatPercent,
  providerLabel,
} from "@features/user-profile/lib/format";
import type { ProfileIdentity, UserProfileDto } from "@features/user-profile/types";

/*
 * Two stat cards share a row on a phone, so they step down there (as on
 * Security): a shorter field, tighter padding and a smaller number.
 */
const STAT_GRID = "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4";
const STAT_COMPACT =
  "max-sm:min-h-[132px] max-sm:rounded-[22px] max-sm:p-4 max-sm:[&_p.font-display]:text-[28px]";

interface Stat {
  label: string;
  value: string;
  Icon: LucideIcon;
  hue: HueClass;
}

function StatGroup({ label, stats }: { label: string; stats: Stat[] }) {
  return (
    <section aria-label={label} className="space-y-3">
      <Kicker>{label}</Kicker>
      <div className={STAT_GRID}>
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} Icon={s.Icon} hue={s.hue} className={STAT_COMPACT} />
        ))}
      </div>
    </section>
  );
}

/**
 * The account at a glance: the headline numbers of each side of it (teaching
 * and learning), the account record, and how the person signs in.
 */
export function OverviewTab({ profile, showLearner }: { profile: UserProfileDto; showLearner: boolean }) {
  const { account, expert, learner } = profile;

  return (
    <div className="space-y-8">
      {expert && (
        <StatGroup
          label="As an expert"
          stats={[
            { label: "Courses", value: formatCount(expert.stats.courseCount), Icon: BookOpen, hue: "k-it" },
            { label: "Published", value: formatCount(expert.stats.publishedCourseCount), Icon: BookCheck, hue: "k-energy" },
            { label: "Enrollments", value: formatCount(expert.stats.totalEnrolled), Icon: ClipboardCheck, hue: "k-data" },
            { label: "İştirakçilər", value: formatCount(expert.stats.distinctParticipants), Icon: Users, hue: "k-res" },
          ]}
        />
      )}
      {showLearner && (
        <StatGroup
          label="As an İştirakçi"
          stats={[
            { label: "Enrolled courses", value: formatCount(learner.stats.enrollmentCount), Icon: BookOpen, hue: "k-navy" },
            { label: "In progress", value: formatCount(learner.stats.activeCount), Icon: PlayCircle, hue: "k-eng" },
            { label: "Completed", value: formatCount(learner.stats.completedCount), Icon: CircleCheckBig, hue: "k-build" },
            { label: "Average progress", value: formatPercent(learner.stats.averageProgress), Icon: Gauge, hue: "k-biz" },
          ]}
        />
      )}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <FormCard icon={<UserRound />} title="Account details" description="The account record as it is stored." grid={false}>
          <DetailList>
            <Detail label="First name">
              <Value>{account.firstName}</Value>
            </Detail>
            <Detail label="Last name">
              <Value>{account.lastName}</Value>
            </Detail>
            <Detail label="Phone">
              <Value>{account.phone}</Value>
            </Detail>
            <Detail label="FIN code">
              <Value mono>{account.finKod}</Value>
            </Detail>
            <Detail label="Locale">
              <Value>{account.locale}</Value>
            </Detail>
            <Detail label="Failed logins">
              {account.failedLogins > 0 ? (
                <Badge tone="warning" size="sm" className="tabular-nums">
                  {account.failedLogins.toLocaleString()}
                </Badge>
              ) : (
                <span className="tabular-nums">0</span>
              )}
            </Detail>
            <Detail label="Last updated">
              <Value>{account.updatedAt && formatDateTime(account.updatedAt)}</Value>
            </Detail>
            <Detail label="Deleted">
              <Value className="text-danger">{account.deletedAt && formatDateTime(account.deletedAt)}</Value>
            </Detail>
            <Detail label="Account ID" wide>
              <Value mono className="break-all">
                {account.id}
              </Value>
            </Detail>
          </DetailList>
        </FormCard>

        <FormCard
          icon={<KeyRound />}
          title="Sign-in methods"
          description="Password and linked providers the account can sign in with."
          grid={false}
        >
          {account.identities.length === 0 ? (
            <SoftEmpty icon={<KeyRound />} title="No sign-in methods linked." />
          ) : (
            <ul className="divide-y divide-line">
              {account.identities.map((identity, i) => (
                <IdentityRow key={`${identity.provider}-${i}`} identity={identity} />
              ))}
            </ul>
          )}
        </FormCard>
      </div>
    </div>
  );
}

function IdentityRow({ identity: i }: { identity: ProfileIdentity }) {
  const Icon = i.provider === "LOCAL" ? KeyRound : i.provider === "GOOGLE" ? Globe : UsersRound;
  return (
    <li className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-navy-tint text-navy">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-ink">{providerLabel(i.provider)}</p>
          {i.emailVerified ? (
            <Badge tone="success" size="sm">
              Verified
            </Badge>
          ) : (
            <Badge tone="warning" size="sm">
              Unverified
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-ink-2 [overflow-wrap:anywhere]">
          <Value>{i.emailAtProvider}</Value>
          {i.displayName && <span className="text-ink-3"> · {i.displayName}</span>}
        </p>
        <p className="meta mt-1.5 text-[12.5px]">
          <span>Linked {formatDate(i.linkedAt)}</span>
          <span>Last sign-in {formatDateTime(i.lastLoginAt)}</span>
        </p>
      </div>
    </li>
  );
}
