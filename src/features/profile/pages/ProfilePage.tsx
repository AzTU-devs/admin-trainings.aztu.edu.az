import { Link } from "react-router";
import { toast } from "sonner";
import { Mail, Phone, Send, Settings as SettingsIcon, ShieldCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import {
  useMeProfileQuery,
  useRequestEmailVerificationMutation,
} from "@features/auth/api/authApi";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useGetMyTutorProfileQuery } from "@features/tutors/api/tutorsApi";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { TutorStatusBadge } from "@features/tutors/components/TutorStatusBadge";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
import { ExpertProfileSection } from "@features/profile/components/ExpertProfileSection";
import { apiErrorMessage } from "@shared/lib/apiError";
import { ROUTES } from "@shared/constants/routes";
import { ROLES, type Role } from "@shared/constants/roles";
import { enumLabel } from "@shared/constants/enumLabels";

export default function ProfilePage() {
  const { data, isLoading, error } = useMeProfileQuery();
  const { isTutor, isStaff } = usePermissions();
  // Tutors have an expert profile (and its photo); so does an applicant who
  // holds only USER until approved. Staff without a tutor role would get a 404.
  const { data: tutor } = useGetMyTutorProfileQuery(undefined, { skip: isStaff && !isTutor });
  const [requestVerification, { isLoading: sendingVerification }] = useRequestEmailVerificationMutation();

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !data) {
    return <EmptyState title="Couldn't load your profile" description="Please try again later." />;
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.email;
  // USER is the participant role every approved expert also holds; next to
  // Tutor or a staff role it only adds noise ("Tutor | Student").
  const shownRoles = (data.roles as Role[]).filter((r) => r !== ROLES.USER || data.roles.length === 1);

  const sendVerification = async () => {
    try {
      await requestVerification().unwrap();
      toast.success(`Verification link sent to ${data.email}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not send the verification email"));
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <TutorAvatar
              size="lg"
              src={tutor ? tutorAvatarSrc(tutor) : null}
              name={fullName}
              className="size-20 mb-4"
              fallbackClassName="bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xl font-semibold"
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{fullName}</h2>
            <p className="text-sm text-gray-500">{data.email}</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {shownRoles.map((r) => (
                <Badge key={r} tone="brand">{enumLabel("role", r)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-4">
            <Detail Icon={Mail} label="Email" value={data.email}>
              {data.emailVerified ? (
                <Badge tone="success" className="ml-2"><ShieldCheck className="size-3" /> Verified</Badge>
              ) : (
                <Badge tone="warning" className="ml-2"><ShieldAlert className="size-3" /> Unverified</Badge>
              )}
            </Detail>
            {!data.emailVerified && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Send className="size-4" />}
                loading={sendingVerification}
                onClick={sendVerification}
              >
                Send verification email
              </Button>
            )}
            <Detail Icon={Phone} label="Phone" value={data.phone || "—"} />
            <Detail Icon={SettingsIcon} label="Locale" value={data.locale || "—"} />
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <p className="text-gray-900 dark:text-white font-medium">{enumLabel("userStatus", data.status)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last sign-in</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isTutor ? (
        <ExpertProfileSection />
      ) : (
        // An applicant cannot edit the profile yet (the API allows that only
        // with TUTOR), but can see where the application stands.
        !isStaff &&
        tutor && (
          <Card className="mt-4">
            <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 dark:text-white">Expert application</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {tutor.headline || "Your expert profile"} — editable once your application is approved.
                </p>
              </div>
              <TutorStatusBadge status={tutor.approvalStatus} />
            </CardContent>
          </Card>
        )
      )}
    </>
  );
}

function Detail({
  Icon,
  label,
  value,
  children,
}: {
  Icon: typeof Mail;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-9 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 inline-flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white inline-flex items-center">
          {value}
          {children}
        </p>
      </div>
    </div>
  );
}
