import { Link } from "react-router";
import { UserRoundSearch } from "lucide-react";
import { Button } from "@shared/components/ui/Button";
import { ROUTES } from "@shared/constants/routes";
import { cn } from "@shared/lib/cn";
import { usePermissions } from "@features/auth/hooks/usePermissions";

/**
 * The way into a person's deep profile from a people table (Users, Tutors, a
 * course's İştirakçilər): the tables' quiet icon button with its name as the
 * tooltip, drawn as a real link so it also opens in a new tab.
 *
 * Renders nothing unless the viewer is a SUPER_ADMIN — the page and its API
 * are theirs alone — so a call site needs no check of its own.
 */
export function ViewProfileLink({ userId, className }: { userId?: string | null; className?: string }) {
  const { isSuperAdmin } = usePermissions();
  if (!isSuperAdmin || !userId) return null;
  return (
    <Button asChild variant="ghost" size="icon" aria-label="View profile" className={cn("shrink-0", className)}>
      {/* A row may be clickable itself; following the link is the only thing this click does. */}
      <Link to={ROUTES.superUserProfile(userId)} onClick={(e) => e.stopPropagation()}>
        <UserRoundSearch className="size-4" />
      </Link>
    </Button>
  );
}
