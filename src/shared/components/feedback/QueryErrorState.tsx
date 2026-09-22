import { AlertTriangle, LogIn, RefreshCw, WifiOff } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/components/ui/Button";
import { useAuth } from "@features/auth/hooks/useAuth";
import { ROUTES } from "@shared/constants/routes";
import { describeQueryError } from "./queryError";

interface Props {
  error: unknown;
  onRetry?: () => void;
  /** Noun for the generic message: "Couldn't load <what>". */
  what?: string;
  className?: string;
  /** Tighter layout for popovers and table cells. */
  compact?: boolean;
}

/**
 * The error counterpart of EmptyState: says the data could not be fetched, why,
 * and offers the one action that can help — retry, or sign in again on a 403.
 * A request the server refused for what it is (a 400 on a malformed id, a 404)
 * fails the same way every time, so it gets no Retry.
 */
export function QueryErrorState({ error, onRetry, what, className, compact }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const d = describeQueryError(error, what);
  const Icon = d.kind === "network" ? WifiOff : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border-2 border-dashed border-error-200 dark:border-error-500/30 text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto rounded-2xl bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 flex items-center justify-center",
          compact ? "size-10 mb-2" : "size-14 mb-4",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{d.title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{d.description}</p>
      <div className={compact ? "mt-3" : "mt-5"}>
        {d.kind === "forbidden" ? (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<LogIn className="size-4" />}
            onClick={async () => {
              await signOut();
              navigate(ROUTES.signIn, { replace: true });
            }}
          >
            Sign in again
          </Button>
        ) : (
          onRetry &&
          d.retryable && (
            <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="size-4" />} onClick={onRetry}>
              Retry
            </Button>
          )
        )}
      </div>
    </div>
  );
}
