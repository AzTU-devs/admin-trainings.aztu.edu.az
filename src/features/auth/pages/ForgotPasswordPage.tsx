import { useState } from "react";
import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { ROUTES } from "@shared/constants/routes";
import { useForgotPasswordMutation } from "@features/auth/api/authApi";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/logo/logo-icon.svg" alt="AzTU" className="size-10" />
            <div>
              <p className="text-base font-bold text-brand-700 dark:text-white">AzTU Portal</p>
              <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Azerbaijan Technical University</p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-8 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 inline-flex items-center justify-center mb-4">
                <MailCheck className="size-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                If an account exists for <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>,
                we've sent a link to reset your password. The link expires in 30 minutes.
              </p>
              <Link
                to={ROUTES.signIn}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline"
              >
                <ArrowLeft className="size-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Forgot your password?</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Enter your account email and we'll send you a reset link.
              </p>

              <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@aztu.edu.az"
                    className={cn(
                      "w-full rounded-xl border bg-white dark:bg-gray-dark px-3.5 py-2.5 text-sm",
                      "text-gray-900 dark:text-white placeholder:text-gray-400 border-gray-200 dark:border-gray-700",
                      "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-shadow",
                    )}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-medium px-4 py-3 transition-colors shadow-theme-sm"
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {isLoading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <Link
                to={ROUTES.signIn}
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline"
              >
                <ArrowLeft className="size-4" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
