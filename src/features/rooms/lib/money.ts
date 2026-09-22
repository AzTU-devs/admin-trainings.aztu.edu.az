/**
 * A rate or fee as the reader's locale groups digits ("4,379,956,200",
 * "71 999 280" in az-AZ) with at most two decimals. Seeded bookings run to ten
 * digits, and an ungrouped "4379956200" could not be read at a glance.
 * Display only: the number the API sent is never rounded anywhere else.
 */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
}
