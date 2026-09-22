import { Kicker, Mosaic, Svg } from "@shared/components/bright";
import { Logo } from "@shared/components/layout/Logo";
import { tileSvg } from "@shared/lib/art";
import { cn } from "@shared/lib/cn";

/*
 * The public website's sign-in layout (trainings.aztu.edu.az, app/[lang]/(auth)/
 * layout.tsx) for the portal: two objects on the paper canvas — a navy colour
 * field with the discipline mosaic around the AzTU shield, and the page's own
 * white form card. The panel only says what the portal is; the card holds
 * everything a person acts on.
 *
 * Phones get a compact version of the same field above the card (the logo,
 * the university line and four tiles), so the page is still recognisably the
 * website's rather than a bare form on a blank canvas.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:p-5">
      <div className="mx-auto grid w-full max-w-[90rem] flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-5">
        <BrandPanel />

        {/* Below lg the brand strip and the card are one column-wide stack
            (centred as a group on tablets), not a full-width bar with a card
            floating far below it. */}
        <div className="flex min-w-0 flex-col px-4 pb-8 pt-4 sm:px-6 sm:py-10 lg:px-0 lg:py-0">
          <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col sm:justify-center lg:max-w-none">
            <MobileBrand />
            <main className="flex flex-col items-center pt-4 lg:pt-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop brand panel. Sticky with a fixed height, like the website's, so a
 * tall card scrolls past it instead of stretching the colour field.
 */
function BrandPanel() {
  return (
    <aside className="k-navy relative isolate hidden overflow-hidden rounded-[40px] bg-k-100 text-k-900 lg:sticky lg:top-5 lg:flex lg:h-[calc(100dvh-2.5rem)] lg:min-h-[36rem] lg:flex-col lg:justify-between lg:self-start lg:p-10 xl:p-12">
      {/* The soft disc in the corner — the field's one shape, as on the website. */}
      <span aria-hidden className="absolute -right-24 -top-28 -z-10 size-[380px] rounded-full bg-k-200" />

      <Logo />

      <div className="max-w-md">
        {/* The mosaic shrinks with the window's height (260px from ~820px
            up) so the headline always fits; on a very short screen it steps
            aside altogether. */}
        <Mosaic
          className={cn(
            "mb-9 w-[min(62%,260px,calc(100dvh-560px))] [@media(max-height:680px)]:hidden",
            NIGHT_TILES,
          )}
        />
        <Kicker className="text-k-700">Azerbaijan Technical University</Kicker>
        {/* h2: the card's title is the page's h1, and this panel is hidden on phones. */}
        <h2 className="d-md mt-5 text-k-900 lg:!text-[2.4rem] xl:!text-[2.75rem]">
          Manage courses, trainings &amp; classrooms — all in one place.
        </h2>
        <p className="mt-5 max-w-[26rem] text-pretty text-base leading-relaxed text-k-900/80">
          The unified portal for tutors, administrators and academic staff of Azerbaijan Technical
          University.
        </p>
      </div>

      <p className="text-xs text-k-900/70">© {new Date().getFullYear()} AzTU. All rights reserved.</p>
    </aside>
  );
}

/*
 * Night fix for tiles on this panel. At night every family's k-100 sits at the
 * panel's own lightness, and the violet (k-it) tiles at nearly its hue as
 * well, so their edges vanished and the 4×4 grid looked gappy. Here only, and
 * only at night: tile fields step up to k-200 with a hairline in their own hue
 * (the shield and the solid gold star already stand out and are left alone),
 * and the violet circle — a tone-on-tone motif that all but disappeared — moves
 * to the gold family with its centre dot lifted to the family's main shade.
 */
const NIGHT_TILES = cn(
  "dark:[&_.mo:not(.shield):not(.gold)]:bg-k-200",
  "dark:[&_.mo:not(.shield):not(.gold)]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--k-300)_45%,transparent)]",
  "dark:[&_.mo.k-it.round]:[--h:88] dark:[&_.mo.k-it.round]:[--k-0:var(--k-500)]",
);

/* Four tiles from the mosaic, for the phone header. */
const MINI_TILES: { k: string; motif: string; round?: boolean }[] = [
  { k: "k-data", motif: "dots" },
  { k: "k-eng", motif: "rings", round: true },
  { k: "k-energy", motif: "wave" },
  { k: "k-biz", motif: "bars" },
];

function MobileBrand() {
  return (
    <div className="k-navy relative isolate overflow-hidden rounded-[28px] bg-k-100 px-5 pb-5 pt-[18px] text-k-900 lg:hidden">
      <span aria-hidden className="absolute -right-14 -top-16 -z-10 size-44 rounded-full bg-k-200" />
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <div aria-hidden className={cn("flex shrink-0 gap-1.5", NIGHT_TILES)}>
          {MINI_TILES.map((t) => (
            <span
              key={t.motif}
              className={cn("mo size-9", t.k, t.round ? "rounded-full" : "rounded-[12px]")}
            >
              <Svg markup={tileSvg(t.motif)} />
            </span>
          ))}
        </div>
      </div>
      <Kicker className="mt-4 text-k-700">Azerbaijan Technical University</Kicker>
    </div>
  );
}
