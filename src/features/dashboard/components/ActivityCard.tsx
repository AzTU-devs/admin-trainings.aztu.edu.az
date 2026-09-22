import { Activity } from "lucide-react";
import { SoftEmpty } from "@shared/components/bright";
import { Card } from "@shared/components/ui/Card";
import { cn } from "@shared/lib/cn";

/**
 * "Recent activity". There is no activity feed yet, so the card holds the
 * app's standard empty row (icon tile + the one line of copy) and is only as
 * tall as that. No placeholder bars: pale bars are what the app shows while
 * something loads, and a permanent set of them reads as a card stuck loading.
 */
export function ActivityCard({ className }: { className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <header className="p-6 pb-2">
        <h2 className="t-md">Recent activity</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">Latest events across your scope</p>
      </header>

      <div className="px-6 pb-6 pt-3">
        {/*
          The copy is a whole sentence, not a short headline, so it is set at
          the helper-line style (14px, medium, ink-2) rather than SoftEmpty's
          bold title: in bold it wrapped to two heavy lines that outweighed the
          card title. `block` gives the span its own line boxes at 14px.
        */}
        <SoftEmpty
          icon={<Activity />}
          title={
            <span className="block text-[14px] font-medium leading-snug text-ink-2">
              Activity timeline will populate once you start using the portal.
            </span>
          }
        />
      </div>
    </Card>
  );
}
