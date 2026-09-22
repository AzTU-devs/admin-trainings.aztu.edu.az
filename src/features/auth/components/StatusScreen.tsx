import { Kicker } from "@shared/components/bright";
import { Logo } from "@shared/components/layout/Logo";
import { cn } from "@shared/lib/cn";

/*
 * The 403 / 404 page, after the website's not-found card: a white card with
 * the status code set big on an inset navy field, then the message and one
 * way out. The code's "0" is gold as on the website; for "no access" it is a
 * gold ring around the AzTU shield instead. Everything in the field is
 * decorative; the kicker under it carries the code for assistive tech.
 */
export function StatusScreen({
  code,
  zero,
  eyebrow,
  title,
  description,
  action,
}: {
  /** The code's first and last digit, e.g. ["4", "4"]. */
  code: [string, string];
  /** The middle "0": a gold digit (404) or a gold ring around the shield (403). */
  zero: "digit" | "shield";
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-paper px-4 pb-8 pt-8 sm:pt-10">
      {/* A soft wash of the navy field from the top, so the canvas is not
          bare. --k-200 swaps with the theme (pale blue by day, deep at night). */}
      <div
        aria-hidden
        className="k-navy pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--k-200)_70%,transparent),transparent_72%)]"
      />

      <Logo />

      <main className="flex w-full flex-1 flex-col items-center justify-center py-6 sm:py-8">
        <div className="w-full max-w-lg rounded-[32px] border border-line bg-surface p-2 shadow-[var(--shadow-md)]">
          <CodeField code={code} zero={zero} />

          <div className="px-5 pb-7 pt-7 text-center sm:px-10 sm:pb-9">
            <Kicker className="justify-center">{eyebrow}</Kicker>
            <h1 className="mt-4 text-balance font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.028em] text-ink sm:text-[2rem]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-pretty text-[15px] leading-relaxed text-ink-2">
              {description}
            </p>
            <div className="mt-7 flex justify-center">{action}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

/*
 * The public website's code field (trainings.aztu.edu.az, NotFoundCard.tsx): its
 * `.surface-deep` navy — brand navy, which never swaps with the theme, under
 * a periwinkle glow and a faint gold one in the top-right corner — with the
 * code in white and the middle "0" in gold. The field stays navy at night on
 * the website too, so the white/gold digits need no night variant.
 */
const DEEP_FIELD =
  "bg-brand-navy bg-[radial-gradient(58%_52%_at_80%_12%,oklch(0.45_0.12_256/.55),transparent_64%),radial-gradient(40%_36%_at_96%_2%,oklch(0.8_0.11_88/.18),transparent_62%)]";

function CodeField({ code, zero }: { code: [string, string]; zero: "digit" | "shield" }) {
  return (
    <div aria-hidden className={cn("overflow-hidden rounded-[26px] px-6 py-12 text-center", DEEP_FIELD)}>
      <p className="flex items-center justify-center font-display text-[6.5rem] font-extrabold leading-none tracking-[-0.06em] text-[#f3f6fb] sm:text-[8rem]">
        <span>{code[0]}</span>
        {zero === "shield" ? <ShieldZero /> : <span className="text-aztu-gold-300">0</span>}
        <span>{code[1]}</span>
      </p>
    </div>
  );
}

/*
 * 403's "0": a gold ring drawn at the digits' stroke weight around the AzTU
 * shield, so it still reads as the number while saying "university access".
 * The shield is the white mark used as a mask over gold, which keeps the
 * whole glyph one colour like the website's gold "0".
 */
function ShieldZero() {
  return (
    <span className="mx-[0.03em] grid h-[0.72em] w-[0.6em] shrink-0 place-items-center rounded-full border-[0.105em] border-aztu-gold-300">
      <span
        className="block h-[0.3em] w-[0.16em] bg-aztu-gold-300"
        style={SHIELD_MASK}
      />
    </span>
  );
}

const SHIELD_MASK: React.CSSProperties = {
  maskImage: "url(/images/logo/aztu-mark-white.png)",
  WebkitMaskImage: "url(/images/logo/aztu-mark-white.png)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
};
