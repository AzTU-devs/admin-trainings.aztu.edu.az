import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Button } from "@shared/components/ui/Button";
import { apiErrorMessage, toNormalizedError } from "@shared/lib/apiError";
import { useChangePasswordMutation } from "@features/auth/api/authApi";
import { passwordPolicy } from "@features/users/schemas/user.schema";

/**
 * Change my password. There was no way to do it from the dashboard: an admin
 * handed a temporary password could only keep it, or go through "forgot
 * password" on the public site.
 */
export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [change, { isLoading }] = useChangePasswordMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const policy = passwordPolicy.safeParse(next);
    if (!current) return setError("Enter your current password.");
    if (!policy.success) return setError(policy.error.issues[0]?.message ?? "Choose a stronger password.");
    if (next !== repeat) return setError("The new passwords don't match.");
    setError(null);
    try {
      await change({ currentPassword: current, newPassword: next }).unwrap();
      setCurrent("");
      setNext("");
      setRepeat("");
      toast.success("Password changed. You were signed out everywhere else.");
    } catch (err) {
      const n = toNormalizedError(err);
      setError(
        n.status === 404
          ? "Changing the password here isn't available on this server yet."
          : apiErrorMessage(n, "Could not change the password"),
      );
    }
  };

  return (
    <Card className="max-w-2xl mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Password
        </CardTitle>
        <CardDescription>
          At least 10 characters, with an uppercase letter, a lowercase letter and a digit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="pw-current" required>Current password</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={100} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-new" required>New password</Label>
              <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-repeat" required>Repeat new password</Label>
              <Input id="pw-repeat" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} maxLength={100} />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" loading={isLoading}>Change password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
