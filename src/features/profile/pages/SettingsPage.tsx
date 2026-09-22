import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { apiErrorMessage } from "@shared/lib/apiError";
import { useMeProfileQuery, useUpdateMeMutation } from "@features/auth/api/authApi";
import { useAppDispatch } from "@lib/redux/hooks";
import { userUpdated } from "@features/auth/store/authSlice";
import { ChangePasswordCard } from "@features/profile/components/ChangePasswordCard";

/** The languages the platform speaks. A free-text box accepted "zz-ZZ". */
const LOCALES = [
  { value: "az", label: "Azərbaycanca" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
];

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
    // The API ignores a blank name and still answers 200, so the page used to say
    // "Profile updated" while keeping the old one. Refuse it here instead.
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    try {
      const updated = await updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Always sent: "" is how the API is told to clear the phone. Sending
        // undefined for an emptied field meant "unchanged", so it could never be removed.
        phone: phone.trim(),
        locale: locale || undefined,
      }).unwrap();
      // Keep the global auth user (header, greeting) in sync.
      dispatch(userUpdated({ fullName: updated.fullName }));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save changes"));
    }
  };

  const localeOptions =
    locale && !LOCALES.some((l) => l.value === locale) ? [...LOCALES, { value: locale, label: `${locale} (current)` }] : LOCALES;

  return (
    <>
      <PageHeader title="Settings" description="Update your profile information and password." />

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max lengths are the API's (80 / 80 / 32): past them the save
                  used to fail with nothing but "Could not save changes". */}
              <div className="space-y-1.5">
                <Label htmlFor="s-first" required>First name</Label>
                <Input id="s-first" value={firstName} maxLength={80} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-last" required>Last name</Label>
                <Input id="s-last" value={lastName} maxLength={80} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Phone</Label>
                <Input id="s-phone" value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} placeholder="+994…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-locale">Language</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="s-locale"><SelectValue placeholder="Choose a language" /></SelectTrigger>
                  <SelectContent>
                    {localeOptions.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      <ChangePasswordCard />
    </>
  );
}
