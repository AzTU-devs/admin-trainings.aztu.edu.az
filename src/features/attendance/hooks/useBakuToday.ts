import { useCallback, useEffect, useState } from "react";
import { bakuToday, msUntilNextBakuDay } from "@features/attendance/lib/attendance";

/**
 * Today in Baku, kept current while the page stays open: a tab left open past
 * midnight must not go on calling yesterday "today" — not in its badge, its
 * day limits or the day it marks. Re-read a moment after each Baku midnight,
 * and whenever the tab comes back (focus, visibility, back/forward cache),
 * since a sleeping laptop runs its timers late. `recheck` reads the clock on
 * demand, for the moment that matters most — a save — and returns the day.
 */
export function useBakuToday(): [today: string, recheck: () => string] {
  const [today, setToday] = useState(() => bakuToday());

  const recheck = useCallback(() => {
    const now = bakuToday();
    setToday(now);
    return now;
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const check = () => {
      recheck();
      window.clearTimeout(timer);
      // A second past midnight, so the new day has surely begun when it fires.
      timer = window.setTimeout(check, msUntilNextBakuDay() + 1_000);
    };
    check();
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [recheck]);

  return [today, recheck];
}
