import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";

interface PaginationState {
  page: number;       // 0-indexed
  size: number;
  totalElements: number;
  totalPages: number;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: SortingState) => void;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  className?: string;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting filters or come back later.",
  pagination,
  onPageChange,
  onSortChange,
  getRowId,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const isEmpty = !isLoading && data.length === 0;

  const table = useReactTable<TData>({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      onSortChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: !!pagination,
    manualSorting: !!onSortChange,
    getRowId: getRowId as ((row: TData, index: number) => string) | undefined,
  });

  return (
    <div className={cn("rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark overflow-hidden", className)}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          {/* Column headers over an empty body read as a broken table, so they
              are dropped while there is nothing to label. */}
          <thead hidden={isEmpty} className="bg-gray-50 dark:bg-white/5">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-200 dark:border-gray-800">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sort = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      colSpan={h.colSpan}
                      className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3"
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-white"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sort === "asc" ? <ArrowUp className="size-3" /> : sort === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-50" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="px-4 py-16 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="p-6">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-b border-gray-100 dark:border-gray-800 last:border-0",
                    onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-gray-700 dark:text-gray-200">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationState;
  onPageChange?: (page: number) => void;
}) {
  const { page, size, totalElements, totalPages } = pagination;
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-200">{from}</span>–
        <span className="font-medium text-gray-700 dark:text-gray-200">{to}</span> of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">{totalElements}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange?.(page - 1)}
          aria-label="Previous page"
          className="size-9 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 px-2">
          {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onPageChange?.(page + 1)}
          aria-label="Next page"
          className="size-9 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
