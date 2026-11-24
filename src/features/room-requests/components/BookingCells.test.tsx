import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingMobileRow, EndsCell, StartsCell, WhenCell } from "./BookingCells";
import type { RoomBookingDto } from "@features/room-requests/types";

/*
 * The booking tables show the platform's wall clock (Asia/Baku) whatever the
 * browser's zone, as the calendar and the Remove confirm do. With the browser's
 * zone a reviewer in New York saw 08:00 Baku on Tuesday as 11:00 PM on Monday.
 */

const booking = (startsAt: string, endsAt: string) =>
  ({
    id: "b0000000-0000-4000-8000-000000000001",
    roomId: "a0000000-0000-4000-8000-000000000301",
    roomName: "Room 301",
    startsAt,
    endsAt,
    status: "PENDING",
    totalFee: 10,
    currency: "AZN",
  }) as unknown as RoomBookingDto;

const originalTz = process.env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(["UTC", "America/New_York", "Pacific/Kiritimati", "Asia/Baku"])("with the browser in %s", (zone) => {
  it("shows 08:00–09:00 Baku on its Baku day", () => {
    process.env.TZ = zone;
    // 04:00Z–05:00Z is 08:00–09:00 on Tue 8 Dec in Baku.
    const { container } = render(<WhenCell booking={booking("2026-12-08T04:00:00Z", "2026-12-08T05:00:00Z")} />);
    expect(screen.getByText("8:00 AM → 9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Tue, Dec 8, 2026")).toBeInTheDocument();
    // The decorative date tile agrees with the line beside it.
    expect(container.querySelector("[aria-hidden]")?.textContent).toBe("Dec8");
  });

  it("spells out the end's date only when the booking passes midnight in Baku", () => {
    process.env.TZ = zone;
    // 19:00Z–21:00Z is 23:00 Tue – 01:00 Wed in Baku, the same day in UTC.
    render(<WhenCell booking={booking("2026-12-08T19:00:00Z", "2026-12-08T21:00:00Z")} />);
    expect(screen.getByText("11:00 PM → Dec 9, 2026, 1:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Tue, Dec 8, 2026")).toBeInTheDocument();
  });

  it("gives the expert's Starts and Ends cells and the phone row the same Baku times", () => {
    process.env.TZ = zone;
    const b = booking("2026-12-08T19:00:00Z", "2026-12-08T21:00:00Z");
    render(
      <>
        <StartsCell booking={b} />
        <EndsCell booking={b} />
        <BookingMobileRow booking={b} />
      </>,
    );
    expect(screen.getByText("11:00 PM")).toBeInTheDocument();
    expect(screen.getByText("1:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Wed, Dec 9, 2026")).toBeInTheDocument();
    expect(screen.getByText("11:00 PM → Dec 9, 2026, 1:00 AM")).toBeInTheDocument();
  });
});
