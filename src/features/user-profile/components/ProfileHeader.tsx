import { useId } from "react";
import { CalendarPlus, Lock, LogIn, MailCheck, ShieldAlert, Trash2 } from "lucide-react";
import { Badge, StatusBadge } from "@shared/components/ui/Badge";
import { resolveApiUrl } from "@shared/config/env";
import { cn } from "@shared/lib/cn";
import { hueFor } from "@shared/lib/hue";
import { ExpertPortrait } from "@features/tutors/components/ExpertPortrait";
import { roleLabel } from "@features/users/lib/roles";
import { Fact, Notice } from "@features/user-profile/components/ProfileBits";
import { DASH, displayNameOf, formatDate, formatDateTime, isLockedNow } from "@features/user-profile/lib/format";
import type { UserProfileDto } from "@features/user-profile/types";

/**
 * The website's drafting grid on the person's hue field, as on My profile:
 * k-100 hairlines every 32px, fading out from the top right.
 */
const DRAFTING_GRID: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, var(--k-100) 1px, transparent 1px), linear-gradient(to bottom, var(--k-100) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  backgroundPosition: "-1px -1px",
  maskImage: "radial-gradient(ellipse 60% 95% at 88% 10%, #000 18%, transparent 72%)",
  WebkitMaskImage: "radial-gradient(ellipse 60% 95% at 88% 10%, #000 18%, transparent 72%)",
};

/**
 * Who this is, drawn like the hero on My profile: the portrait on the
 * person's hue field (seeded by email, like the Users table and the header's
 * user menu, so they are the same colour everywhere), role pills, the
 * account status, the name and the email. Under it, anything wrong with the
 * account as a notice, then the quick facts.
 */
export function ProfileHeader({ profile }: { profile: UserProfileDto }) {
  const { account, expert } = profile;
  const name = displayNameOf(account);
  const hue = hueFor(account.email || name);
  // The account photo, else the expert photo. Both are on the authenticated
  // media route: ExpertPortrait fetches them with the token (useLoadableSrc),
  // never as a bare <img src>. resolveApiUrl points a root-relative path at
  // the API when it runs on another origin.
  const photo = resolveApiUrl(account.avatarUrl ?? expert?.avatarUrl ?? null) || null;
  // A failed-login lockout still running, or an account locked outright.
  const locked = isLockedNow(account.lockedUntil);
  const showLock = locked || account.status === "LOCKED";
  const nameId = useId();

  return (
    <div className="space-y-4">
      <section
        aria-labelledby={nameId}
        className={cn(
          "relative isolate overflow-hidden rounded-[28px] bg-k-50 text-k-900 shadow-[inset_0_0_0_1px_var(--k-100)]",
          hue,
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={DRAFTING_GRID} />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:gap-7 lg:p-8">
          <ExpertPortrait
            src={photo}
            name={name}
            seed={account.id}
            hue={hue}
            className="aspect-[5/6] w-24 shrink-0 shadow-[0_0_0_1px_var(--k-200)] sm:w-28 lg:w-32"
          />
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {account.roles.map((r) => (
                <span key={r} className="pill pill-k0 pill-sm shadow-[inset_0_0_0_1px_var(--k-200)]">
                  {roleLabel(r)}
                </span>
              ))}
              <StatusBadge
                value={account.status}
                size="sm"
                // A deleted account is the loudest thing a profile can say.
                tone={account.status === "DELETED" ? "danger" : undefined}
                className="shadow-[inset_0_0_0_1px_var(--k-200)]"
              />
            </div>
            <h2 id={nameId} className="mt-3 break-words font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.032em] text-k-900 sm:text-[34px] lg:text-[38px]">
              {name}
            </h2>
            <p className="mt-2 break-all text-[15px] text-k-700">{account.email}</p>
            {expert?.headline?.trim() && (
              <p className="mt-1 break-words text-[14px] leading-snug text-k-700">{expert.headline.trim()}</p>
            )}
          </div>
        </div>
      </section>

      {account.deletedAt && (
        <Notice tone="danger" Icon={Trash2} title={`Deleted on ${formatDateTime(account.deletedAt)}`}>
          The account is kept for inspection only and can no longer sign in.
        </Notice>
      )}
      {showLock && (
        <Notice
          tone="warning"
          Icon={ShieldAlert}
          title={locked ? `Sign-in locked until ${formatDateTime(account.lockedUntil)}` : "Sign-in is locked"}
        >
          {account.failedLogins > 0
            ? `After ${account.failedLogins.toLocaleString()} failed sign-in attempt${account.failedLogins === 1 ? "" : "s"}. `
            : ""}
          A super admin can unlock the account from the Users page.
        </Notice>
      )}

      {/* The quick facts, divided by hairlines (the 1px gap over a line-coloured
          track draws them, whatever wraps): two to a row on a phone. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        <Fact Icon={CalendarPlus} label="Joined">
          {formatDate(account.createdAt)}
        </Fact>
        <Fact Icon={LogIn} label="Last login">
          {formatDateTime(account.lastLoginAt)}
        </Fact>
        <Fact Icon={MailCheck} label="Email verified">
          {account.emailVerifiedAt ? (
            formatDate(account.emailVerifiedAt)
          ) : (
            <Badge tone="warning" size="sm">
              Not verified
            </Badge>
          )}
        </Fact>
        <Fact Icon={Lock} label="Locked until">
          {account.lockedUntil ? (
            <span className={cn(locked ? "text-danger" : "text-ink-3")}>
              {formatDateTime(account.lockedUntil)}
              {!locked && <span className="sr-only"> (ended)</span>}
            </span>
          ) : (
            <span className="text-ink-3">{DASH}</span>
          )}
        </Fact>
      </dl>
    </div>
  );
}
