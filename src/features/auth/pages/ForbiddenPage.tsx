import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { ShieldAlert } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

export default function ForbiddenPage() {
  return (
    <>
      <Helmet>
        <title>403 · Access denied · AzTU Portal</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto size-16 rounded-2xl bg-aztu-gold-100 dark:bg-aztu-gold-500/10 text-aztu-gold-700 dark:text-aztu-gold-300 flex items-center justify-center mb-6">
            <ShieldAlert className="size-8" />
          </div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 tracking-widest uppercase mb-2">
            403 · Forbidden
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            You don&apos;t have access to this page
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Your account doesn&apos;t carry the role required to view this resource. If you
            believe this is a mistake, contact an administrator.
          </p>
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center justify-center rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-5 py-2.5"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
