import { TablePager, type PaginationState } from "@shared/components/tables/DataTable";

/**
 * The pager for a list that is not a DataTable (the rooms and people lists on
 * phones): the shared TablePager, so both read as one control. Kept as its
 * own export because those lists import it from here.
 */
export function ListPager({
  pagination,
  onPageChange,
  className,
}: {
  pagination: PaginationState;
  onPageChange?: (page: number) => void;
  /** Footer padding override when the pager closes a card (e.g. `px-4 py-3.5`). */
  className?: string;
}) {
  return <TablePager pagination={pagination} onPageChange={onPageChange} className={className} />;
}
