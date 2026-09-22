import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { KeyRound, MailCheck, Send } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";
import { useForgotPasswordMutation } from "@features/auth/api/authApi";
import { Button, Input } from "@shared/components/ui";
import { AuthShell } from "@features/auth/components/AuthShell";
import { AuthBackLink, AuthCard, AuthField } from "@features/auth/components/AuthCard";

/**
 * Honest password-reset request page. Posts the email to
 * `POST /api/auth/password/forgot` (the backend always replies 202 to avoid
 * account enumeration). The actual reset link is delivered by email — in dev
 * (MAIL_ENABLED=false) it is logged server-side. Resetting itself happens on
 * the public student site (`/reset-password?token=...`), so this admin app only
 * triggers the email.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [forgot, { isLoading }] = useForgotPasswordMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await forgot({ email: email.trim() }).unwrap();
    } catch {
      // Backend always returns 202; ignore errors to avoid enumeration leaks.
    } finally {
      setSent(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset password · AzTU Portal</title>
      </Helmet>
      <AuthShell>
        {sent ? (
          <AuthCard
            tone="ok"
            icon={<MailCheck />}
            title="Check your email"
            subtitle={
              <>
                If an account exists for <span className="font-semibold text-ink [overflow-wrap:anywhere]">{email}</span>,
                we've sent a link to reset your password. The link expires in 30 minutes.
              </>
            }
            footer={<AuthBackLink to={ROUTES.signIn}>Back to sign in</AuthBackLink>}
          />
        ) : (
          <AuthCard
            icon={<KeyRound />}
            title="Forgot your password?"
            subtitle="Enter your account email and we'll send you a reset link."
            footer={<AuthBackLink to={ROUTES.signIn}>Back to sign in</AuthBackLink>}
          >
            <form onSubmit={submit} className="space-y-5" noValidate>
              <AuthField label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aztu.edu.az"
                  className="h-12 rounded-2xl px-4 text-[15px]"
                />
              </AuthField>

              <Button
                type="submit"
                size="lg"
                full
                loading={isLoading}
                leftIcon={<Send className="size-4" />}
                className="mt-2"
              >
                {isLoading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </AuthCard>
        )}
      </AuthShell>
    </>
  );
}
