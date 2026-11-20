import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBakuToday } from "./useBakuToday";

afterEach(() => {
  vi.useRealTimers();
});

describe("useBakuToday", () => {
  it("moves on at Baku's midnight with the page left open", () => {
    vi.useFakeTimers();
    // 23:59:30 in Baku.
    vi.setSystemTime(new Date("2026-11-13T19:59:30Z"));
    const { result } = renderHook(() => useBakuToday());
    expect(result.current[0]).toBe("2026-11-13");

    act(() => vi.advanceTimersByTime(29_000));
    expect(result.current[0]).toBe("2026-11-13");
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current[0]).toBe("2026-11-14");
    // …and again the next night.
    act(() => vi.advanceTimersByTime(86_400_000));
    expect(result.current[0]).toBe("2026-11-15");
  });

  it("looks again when the tab comes back, as a sleeping laptop's timers run late", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T14:00:00Z"));
    const { result } = renderHook(() => useBakuToday());
    expect(result.current[0]).toBe("2026-11-12");

    // The next morning, no timer has run yet.
    vi.setSystemTime(new Date("2026-11-13T05:00:00Z"));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current[0]).toBe("2026-11-13");

    vi.setSystemTime(new Date("2026-11-14T05:00:00Z"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current[0]).toBe("2026-11-14");
  });

  it("reads the clock on demand, for a save", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T14:00:00Z"));
    const { result } = renderHook(() => useBakuToday());

    vi.setSystemTime(new Date("2026-11-13T05:00:00Z"));
    let read = "";
    act(() => {
      read = result.current[1]();
    });
    expect(read).toBe("2026-11-13");
    expect(result.current[0]).toBe("2026-11-13");
  });
});
