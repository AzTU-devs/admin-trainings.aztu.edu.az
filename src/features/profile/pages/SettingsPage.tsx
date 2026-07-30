import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { useMeProfileQuery, useUpdateMeMutation } from "@features/auth/api/authApi";
import { useAppDispatch } from "@lib/redux/hooks";
import { userUpdated } from "@features/auth/store/authSlice";

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
    return <EmptyState title="Couldn't load your settings" description="Please try again later." />;
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

  return (
    <>
      <PageHeader title="Settings" description="Update your profile information." />

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={data.email} disabled />
              <p className="text-xs text-gray-500">Email can't be changed here.</p>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={saving} leftIcon={<Save className="size-4" />}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
