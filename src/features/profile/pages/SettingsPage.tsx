import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Mail, Save, UserRound } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { hueFor } from "@shared/lib/hue";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { useMeProfileQuery, useUpdateMeMutation } from "@features/auth/api/authApi";
import { useAppDispatch } from "@lib/redux/hooks";
import { userUpdated } from "@features/auth/store/authSlice";
import { FormCard } from "@features/courses/components/FormCard";
import { ProfileHero } from "@features/profile/components/ProfileHero";
import { StickySaveBar } from "@features/profile/components/StickySaveBar";

export default function SettingsPage() {
  const { data, isLoading, error } = useMeProfileQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const dispatch = useAppDispatch();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState("");

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName ?? "");
      setLastName(data.lastName ?? "");
      setPhone(data.phone ?? "");
      setLocale(data.locale ?? "");
    }
  }, [data]);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !data) {
    return <EmptyState tone="danger" title="Couldn't load your settings" description="Please try again later." />;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateMe({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        locale: locale.trim() || undefined,
      }).unwrap();
      // Keep the global auth user (header, greeting) in sync.
      dispatch(userUpdated({ fullName: updated.fullName }));
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save changes");
    }
  };

  const name = [firstName, lastName].map((p) => p.trim()).filter(Boolean).join(" ") || data.email;

  return (
    <>
      <PageHeader title="Settings" description="Update your profile information." />

      {/* The course editor's form layout: one card per section (icon tile,
          display title, fields on the two-column grid) and the sticky save
          bar under them. Beside it, a compact copy of the My profile hero —
          the person as the dashboard draws them, following the name fields
          as they are typed. */}
      <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <FormCard icon={<UserRound />} title="Profile">
            <div className="space-y-1.5">
              <Label htmlFor="s-first">First name</Label>
              <Input id="s-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-last">Last name</Label>
              <Input id="s-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-locale">Locale</Label>
              <Input id="s-locale" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="az / en / ru" maxLength={8} />
            </div>
          </FormCard>

          {/* The card's title names the field (and its hint says why it is
              locked), so the input takes its name from an aria-label instead
              of repeating "Email" as a label right under the title. The lock
              says "read-only" in both themes; at night the disabled fill
              alone is too close to the editable fields'. */}
          <FormCard icon={<Mail />} title="Email" description="Email can't be changed here.">
            <Input
              aria-label="Email"
              value={data.email}
              disabled
              rightSlot={
                <span aria-hidden className="grid size-8 place-items-center text-ink-3">
                  <Lock className="size-4" />
                </span>
              }
            />
          </FormCard>

          <StickySaveBar label={name}>
            <Button type="submit" loading={saving} leftIcon={<Save className="size-4" />} className="shrink-0">
              Save changes
            </Button>
          </StickySaveBar>
        </div>

        <ProfileHero
          compact
          name={name}
          email={data.email}
          roles={data.roles}
          hue={hueFor(data.email || name)}
          seed={data.email}
          className="hidden lg:sticky lg:top-24 lg:block"
        />
      </form>
    </>
  );
}
