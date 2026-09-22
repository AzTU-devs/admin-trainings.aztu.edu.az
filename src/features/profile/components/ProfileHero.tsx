import { cn } from "@shared/lib/cn";
import type { HueClass } from "@shared/lib/categoryStyle";
import { ExpertPortrait } from "@features/tutors/components/ExpertPortrait";

const ROLE_LABEL: Record<string, string> = {
  USER: "Student",
  TUTOR: "Tutor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

/**
 * The website's drafting grid on a hue field (its course and category heroes):
 * k-100 hairlines every 32px on the faint k-50 field, fading out from the top
 * right so the name side stays calm.
 */
const DRAFTING_GRID: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, var(--k-100) 1px, transparent 1px), linear-gradient(to bottom, var(--k-100) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  backgroundPosition: "-1px -1px",
  maskImage: "radial-gradient(ellipse 60% 95% at 88% 10%, #000 18%, transparent 72%)",
  WebkitMaskImage: "radial-gradient(ellipse 60% 95% at 88% 10%, #000 18%, transparent 72%)",
};

interface Props {
  name: string;
  email: string;
  roles: string[];
  /** The person's colour (seeded by email, like the header's user menu). */
  hue: HueClass;
  /** Seed for the monogram drawing. */
  seed: string;
  /** A tutor's photo (`tutorAvatarSrc`); the monogram otherwise. */
  photo?: string | null;
  /**
   * The settings page's side card: the same field, portrait and type a size
   * down, stacked for a 20rem column. Decorative there (the fields beside it
   * hold the same values), so it is hidden from assistive tech.
   */
  compact?: boolean;
  className?: string;
}

/**
 * The person as the dashboard draws them, like the expert hero on the public
 * website: the arch portrait on the faint k-50 field (with its own k-100
 * arch and a k-200 hairline, so it reads as a framed portrait rather than
 * melting into the banner), role pills, the name in the display face and the
 * email. My profile shows it full size and Settings a compact copy, so the
 * same user looks the same on both pages.
 */
export function ProfileHero({ name, email, roles, hue, seed, photo, compact, className }: Props) {
  const Root = compact ? "aside" : "section";
  const Name = compact ? "p" : "h2";
  return (
    <Root
      aria-hidden={compact || undefined}
      className={cn(
        "relative isolate overflow-hidden rounded-[28px] bg-k-50 text-k-900 shadow-[inset_0_0_0_1px_var(--k-100)]",
        hue,
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={DRAFTING_GRID} />
      <div className={cn("flex flex-col", compact ? "gap-4 p-6" : "gap-5 p-6 sm:flex-row sm:items-end sm:gap-7 lg:p-8")}>
        <ExpertPortrait
          src={photo}
          name={name}
          seed={seed}
          hue={hue}
          className={cn(
            "shrink-0 aspect-[5/6] shadow-[0_0_0_1px_var(--k-200)]",
            compact ? "w-20" : "w-28 sm:w-32 lg:w-40",
          )}
        />
        <div className={cn("min-w-0", !compact && "pb-1")}>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span key={r} className="pill pill-k0 pill-sm shadow-[inset_0_0_0_1px_var(--k-200)]">
                {ROLE_LABEL[r] ?? r}
              </span>
            ))}
          </div>
          <Name
            className={cn(
              "break-words font-display font-extrabold text-k-900",
              compact
                ? "mt-2.5 text-[22px] leading-[1.1] tracking-[-0.026em]"
                : "mt-3 text-[30px] leading-[1.05] tracking-[-0.032em] sm:text-[36px] lg:text-[42px]",
            )}
          >
            {name}
          </Name>
          <p className={cn("break-all text-k-700", compact ? "mt-1.5 text-[13.5px]" : "mt-2 text-[15px]")}>{email}</p>
        </div>
      </div>
    </Root>
  );
}
