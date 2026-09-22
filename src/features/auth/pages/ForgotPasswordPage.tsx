import { useState } from "react";
import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { ROUTES } from "@shared/constants/routes";
import { useForgotPasswordMutation } from "@features/auth/api/authApi";
import { Logo } from "@shared/components/layout/Logo";
import { toNormalizedError } from "@shared/lib/apiError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password-reset request page. Posts the email to
 * `POST /api/auth/password/forgot`, which answers 202 whether or not an account
 * exists, so success says nothing about the address. The reset link is delivered
 * by email — in dev (MAIL_ENABLED=false) it is logged server-side — and resetting
 * itself happens on the public site (`/reset-password?token=...`).
 *
 * "Check your email" is shown only after that 202. It used to be shown after any
 * outcome, so a malformed address (400), the hourly limit (429) or a dropped
 * connection all told the user a link was on its way. None of those failures
 * reveals whether an account exists, so reporting them leaks nothing.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, { isLoading }] = useForgotPasswordMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    try {
      await forgot({ email: address }).unwrap();
      setSent(true);
    } catch (err) {
      const n = toNormalizedError(err);
      // 429 already reads "Too many attempts… try again in N minutes", and a
      // network failure says the server can't be reached.
      setError(n.status === 400 ? "Enter a valid email address." : n.message || "Something went wrong. Please try again.");
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
            <Logo showText={false} />
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
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? "forgot-error" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="name@aztu.edu.az"
                    className={cn(
                      "w-full rounded-xl border bg-white dark:bg-gray-dark px-3.5 py-2.5 text-sm",
                      "text-gray-900 dark:text-white placeholder:text-gray-400",
                      error ? "border-error-300 dark:border-error-500/60" : "border-gray-200 dark:border-gray-700",
                      "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-shadow",
                    )}
                  />
                  {error && (
                    <p id="forgot-error" role="alert" className="mt-1.5 text-xs text-error-600 dark:text-error-400">
                      {error}
                    </p>
                  )}
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
