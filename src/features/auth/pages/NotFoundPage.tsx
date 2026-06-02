import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { Compass } from "lucide-react";
import { ROUTES } from "@shared/constants/routes";

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 · Page not found · AzTU Portal</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto size-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-6">
            <Compass className="size-8" />
          </div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 tracking-widest uppercase mb-2">
            404 · Not found
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            We couldn&apos;t find that page
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            The page you&apos;re looking for may have been moved, renamed, or never existed.
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
