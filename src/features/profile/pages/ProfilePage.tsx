import { Link } from "react-router";
import { Mail, Phone, Settings as SettingsIcon, ShieldCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Avatar } from "@shared/components/ui/Avatar";
import { Badge } from "@shared/components/ui/Badge";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { useMeProfileQuery } from "@features/auth/api/authApi";
import { ROUTES } from "@shared/constants/routes";

const ROLE_LABEL: Record<string, string> = {
  USER: "Student",
  TUTOR: "Tutor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export default function ProfilePage() {
  const { data, isLoading, error } = useMeProfileQuery();

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !data) {
    return <EmptyState title="Couldn't load your profile" description="Please try again later." />;
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.email;
  const initials = fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

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
            <Avatar size="lg" className="size-20 mb-4 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 items-center justify-center text-xl font-semibold">
              <span>{initials}</span>
            </Avatar>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{fullName}</h2>
            <p className="text-sm text-gray-500">{data.email}</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {data.roles.map((r) => (
                <Badge key={r} tone="brand">{ROLE_LABEL[r] ?? r}</Badge>
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
            <Detail Icon={Phone} label="Phone" value={data.phone || "—"} />
            <Detail Icon={SettingsIcon} label="Locale" value={data.locale || "—"} />
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <p className="text-gray-900 dark:text-white font-medium">{data.status}</p>
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
