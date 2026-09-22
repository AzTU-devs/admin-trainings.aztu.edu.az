import { Link } from "react-router";
import {
  Activity,
  Clock,
  Globe,
  Mail,
  Phone,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { cn } from "@shared/lib/cn";
import { hueFor } from "@shared/lib/hue";
import { formatEnum } from "@shared/lib/enums";
import { useMeProfileQuery } from "@features/auth/api/authApi";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useGetMyTutorProfileQuery } from "@features/tutors/api/tutorsApi";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
import { ExpertProfileSection } from "@features/profile/components/ExpertProfileSection";
import { ProfileHero } from "@features/profile/components/ProfileHero";
import { ROUTES } from "@shared/constants/routes";

export default function ProfilePage() {
  const { data, isLoading, error } = useMeProfileQuery();
  const { isTutor } = usePermissions();
  // Only tutors have an expert profile (and its photo); for anyone else the
  // request would be a guaranteed 404.
  const { data: tutor } = useGetMyTutorProfileQuery(undefined, { skip: !isTutor });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !data) {
    return <EmptyState tone="danger" title="Couldn't load your profile" description="Please try again later." />;
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.email;
  // The colour the header's user menu gives this person (seeded by email), so
  // the header chip, this page and the settings preview all agree.
  const hue = hueFor(data.email || fullName);

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your account details."
        actions={
          <Button variant="secondary" asChild leftIcon={<SettingsIcon className="size-4" />}>
            <Link to={ROUTES.settings}>Edit profile</Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {/* The profile header, like the expert hero on the public website
            (Settings shows a compact copy of it). */}
        <ProfileHero
          name={fullName}
          email={data.email}
          roles={data.roles}
          hue={hue}
          seed={data.email}
          photo={tutor ? tutorAvatarSrc(tutor) : null}
        />

        {/* Key facts under the header, divided by hairlines (the website's
            facts strip); the 1px gap over a line-coloured track draws them,
            which keeps them right whatever wraps. Below xl the email takes a
            row of its own and the other four share the next row(s), so every
            row stays full. On one xl row the columns are weighted by what
            they hold: equal fifths cut the email at "superadmin@eduplatfo…"
            while "en" and "—" sat in mostly empty cells. The email wraps as a
            last resort rather than being cut. */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <Fact
            Icon={Mail}
            label="Email"
            className="col-span-2 sm:col-span-4 xl:col-span-1"
            aside={
              data.emailVerified ? (
                <Badge tone="success" size="sm"><ShieldCheck className="size-3" /> Verified</Badge>
              ) : (
                <Badge tone="warning" size="sm"><ShieldAlert className="size-3" /> Unverified</Badge>
              )
            }
          >
            <span className="block [overflow-wrap:anywhere]">{data.email}</span>
          </Fact>
          {/* Proportional figures, as in every other value: tabular ones set a
              lone date or number wider and heavier than its neighbours. */}
          <Fact Icon={Phone} label="Phone">{data.phone || "—"}</Fact>
          <Fact Icon={Globe} label="Locale">{data.locale || "—"}</Fact>
          <Fact Icon={Activity} label="Status">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", data.status === "ACTIVE" ? "bg-ok" : "bg-ink-3")}
              />
              {formatEnum(data.status)}
            </span>
          </Fact>
          <Fact Icon={Clock} label="Last sign-in">
            {data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : "—"}
          </Fact>
        </dl>
      </div>

      {isTutor && <ExpertProfileSection />}
    </>
  );
}

/**
 * One fact: a quiet label with its icon over the value (`.fact` from
 * index.css). `aside` sits at the end of the label row (the email's
 * verification), so every value line starts and reads the same.
 */
function Fact({
  Icon,
  label,
  aside,
  className,
  children,
}: {
  Icon: typeof Mail;
  label: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // A touch tighter on phones, where two facts share a 390px row: enough
    // that a full phone number stays on one line.
    <div className={cn("fact bg-surface px-4 py-4 sm:px-5", className)}>
      <dt className="l">
        <Icon aria-hidden />
        {label}
        {aside && <span className="ml-auto">{aside}</span>}
      </dt>
      <dd className="v text-[14.5px] sm:text-[15px]">{children}</dd>
    </div>
  );
}
