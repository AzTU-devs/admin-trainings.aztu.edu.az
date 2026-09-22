import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff, LifeBuoy, LogIn } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { loginSchema, type LoginFormValues } from "@features/auth/schemas/login.schema";
import { useLoginMutation } from "@features/auth/api/authApi";
import { useAppDispatch } from "@lib/redux/hooks";
import { authSuccess } from "@features/auth/store/authSlice";
import { useAuth } from "@features/auth/hooks/useAuth";
import { ROUTES } from "@shared/constants/routes";
import { Button, Input } from "@shared/components/ui";
import { AuthShell } from "@features/auth/components/AuthShell";
import { AuthCard, AuthField } from "@features/auth/components/AuthCard";
import type { NormalizedError } from "@lib/axios/httpClient";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [login, { isLoading }] = useLoginMutation();

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? ROUTES.dashboard;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const res = await login(values).unwrap();
      dispatch(authSuccess({ user: res.user, accessToken: res.accessToken }));
      toast.success(`Welcome back, ${res.user.fullName.split(" ")[0]}`);
      navigate(from, { replace: true });
    } catch (err) {
      const e = err as NormalizedError;
      if (e.fieldErrors) {
        for (const [field, msg] of Object.entries(e.fieldErrors)) {
          setError(field as keyof LoginFormValues, { message: msg });
        }
      }
      toast.error(e.message || "Sign in failed");
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in · AzTU Portal</title>
      </Helmet>
      <AuthShell>
        <AuthCard icon={<LogIn />} title="Welcome back" subtitle="Sign in to access your dashboard.">
          {/* Auth fields are the website's: 48px and fully rounded (rounded-2xl
              is 24px here), a step up from the dashboard's 44px form fields. */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <AuthField label="Email" htmlFor="email" error={errors.email?.message} errorId="email-error">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@aztu.edu.az"
                invalid={!!errors.email}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="h-12 rounded-2xl px-4 text-[15px]"
                {...register("email")}
              />
            </AuthField>

            {/* No "remember me": the session is deliberately tab-scoped — the access
                token lives in sessionStorage and the refresh cookie is not readable
                here, so a checkbox promising a persisted login would be a lie.
                "Forgot password?" sits on the label row, as on the website. */}
            <AuthField
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              errorId="password-error"
              aside={
                <Link
                  to={ROUTES.forgotPassword}
                  // The padding grows the tap target to 40px; the negative
                  // margin keeps the label row at its text height.
                  className="-my-2.5 inline-flex items-center rounded-full py-2.5 text-[13px] font-semibold text-navy underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              }
            >
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={!!errors.password}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="[&>input]:h-12 [&>input]:rounded-2xl [&>input]:text-[15px]"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-ink/6 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
                {...register("password")}
              />
            </AuthField>

            <Button
              type="submit"
              size="lg"
              full
              loading={isLoading}
              leftIcon={<LogIn className="size-4" />}
              // The button is inline-flex, so its margin adds to the field's
              // rather than collapsing: 20 + 8 = the website's 28px.
              className="mt-2"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Help sits in a soft well under the form, like the website's
              "are you an expert?" note — present, but out of the way. */}
          <div className="mt-6 flex items-center gap-3.5 rounded-[20px] bg-paper-2 p-4">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface text-navy shadow-[0_0_0_1px_var(--line)]"
            >
              <LifeBuoy className="size-[18px]" />
            </span>
            <p className="min-w-0 text-[13px] leading-relaxed text-ink-2">
              Trouble signing in? Contact the IT helpdesk at{" "}
              <a
                href="mailto:helpdesk@aztu.edu.az"
                className="whitespace-nowrap font-semibold text-navy underline-offset-4 hover:underline"
              >
                helpdesk@aztu.edu.az
              </a>
            </p>
          </div>
        </AuthCard>
      </AuthShell>
    </>
  );
}
