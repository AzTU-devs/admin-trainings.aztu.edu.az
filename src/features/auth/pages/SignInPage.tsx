import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { loginSchema, type LoginFormValues } from "@features/auth/schemas/login.schema";
import { useLoginMutation } from "@features/auth/api/authApi";
import { useAppDispatch } from "@lib/redux/hooks";
import { authSuccess } from "@features/auth/store/authSlice";
import { useAuth } from "@features/auth/hooks/useAuth";
import { cn } from "@shared/lib/cn";
import { ROUTES } from "@shared/constants/routes";
import { Logo } from "@shared/components/layout/Logo";
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
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  if (isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const res = await login(values).unwrap();
      dispatch(
        authSuccess({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        }),
      );
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
      <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-900">
        {/* Brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950">
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-aztu-gold-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 size-[28rem] rounded-full bg-brand-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <img src="/images/logo/aztu-mark-white.png" alt="AzTU" className="h-12 w-[25px] shrink-0 object-contain" />
            <div>
              <p className="text-lg font-bold tracking-wide">AzTU Portal</p>
              <p className="text-xs text-aztu-gold-200/90 tracking-[0.2em] uppercase">
                Azerbaijan Technical University
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Manage courses, trainings &amp; classrooms — all in one place.
            </h1>
            <p className="text-white/70 text-sm xl:text-base">
              The unified portal for tutors, administrators and academic staff of
              Azerbaijan Technical University.
            </p>
          </div>

          <div className="relative z-10 text-xs text-white/60">
            © {new Date().getFullYear()} AzTU. All rights reserved.
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <Logo showText={false} />
              <div>
                <p className="text-base font-bold text-brand-700 dark:text-white">AzTU Portal</p>
                <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Azerbaijan Technical University</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Sign in to access your dashboard.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@aztu.edu.az"
                  className={inputCls(!!errors.email)}
                  {...register("email")}
                />
              </Field>

              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(inputCls(!!errors.password), "pr-11")}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
                    {...register("rememberMe")}
                  />
                  <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link
                  to={ROUTES.forgotPassword}
                  className="text-brand-700 dark:text-brand-300 font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-3 transition-colors shadow-theme-sm"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {isLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
              Trouble signing in? Contact the IT helpdesk at{" "}
              <a href="mailto:helpdesk@aztu.edu.az" className="text-brand-700 dark:text-brand-300 hover:underline">
                helpdesk@aztu.edu.az
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-error-600 dark:text-error-400">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-white dark:bg-gray-dark px-3.5 py-2.5 text-sm",
    "text-gray-900 dark:text-white placeholder:text-gray-400",
    "focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500",
    "transition-shadow",
    hasError
      ? "border-error-300 focus:border-error-500 focus:ring-error-500/15"
      : "border-gray-200 dark:border-gray-700",
  );
}
