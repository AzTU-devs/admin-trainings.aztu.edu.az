import { PageHeader } from "@shared/components/layout/PageHeader";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { CircleDollarSign } from "lucide-react";

/**
 * Pricing is now a per-room `hourlyRate` field on the room itself (managed in
 * the Rooms page). There's no separate pricing API. See GAP_REPORT.md if
 * time-bounded / tiered pricing rules are needed.
 */
export default function RoomPricingPage() {
  return (
    <>
      <PageHeader title="Room pricing" description="Hourly rates are set per room." />
      <EmptyState
        Icon={CircleDollarSign}
        title="Pricing is managed on each room"
        description="Set a room's hourly rate in the Rooms page. A dedicated time-bounded pricing API isn't part of the backend yet."
      />
    </>
  );
}
