import {
  type Column,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Table,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { MQ, useMediaQuery } from "@shared/lib/useMediaQuery";
import { useScrollFade } from "@shared/lib/useScrollFade";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { pageWindow } from "./pageWindow";

/*
 * Per-column presentation, set in a column's `meta`:
 *
 *   { header: "Enrolled", meta: { align: "right" }, … }      // numbers line up
 *   { header: "Tutor", meta: { hideBelow: "xl" }, … }         // dropped on narrow screens
 *
 * `align: "right"` right-aligns the header and the cells (the table already
 * sets tabular numerals), so 2 and 35, 5 ms and 210 ms compare down the
 * column. `hideBelow` hides a low-priority column under that breakpoint —
 * between 768 and 1279px a 1000px table otherwise scrolled sideways in a
 * 690px card with Price and Enrolled out of sight.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right";
    hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
  }
}

const HIDE_BELOW = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
  xl: "max-xl:hidden",
  "2xl": "max-2xl:hidden",
} as const;

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

/** The th/td classes a column's meta asks for. */
function metaClasses<TData>(column: Column<TData, unknown>): string {
  const meta = column.columnDef.meta;
  return cn(meta?.align && ALIGN[meta.align], meta?.hideBelow && HIDE_BELOW[meta.hideBelow]);
}

export interface PaginationState {
  page: number; // 0-indexed
  size: number;
  totalElements: number;
  totalPages: number;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  /**
   * A request is in flight. The first load shows skeleton rows; a refetch
   * (next page, a new filter) keeps the current rows under a thin loading
   * bar — the card no longer collapses to a spinner and back, so the pager
   * stays where the pointer is. The rows stay live: their buttons still work
   * during a background refetch.
   */
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: SortingState) => void;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  /**
   * Phones (below md): render each row as a card in a divided list instead of
   * a table row — content for the card, inside a padded list item. Sortable
   * columns keep their sort buttons in a row above the cards. Without it the
   * table stays a table; if it is wider than the card it scrolls sideways
   * with a fade at the edge that has more columns (pages that fold columns
   * into the first cell with their own classes keep doing so).
   */
  renderMobileRow?: (row: TData) => React.ReactNode;
  className?: string;
}

/**
 * The list table: a rounded surface card with a quiet header row, 56px+ rows
 * on hairlines and the website's numbered pager. With `renderMobileRow`, rows
 * become stacked cards below md — a 900px-wide table scrolled sideways inside
 * a 358px card showed one column and cut emails mid-word.
 */
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
  renderMobileRow,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // Desktop by default where matchMedia is missing (tests, first paint).
  const wide = useMediaQuery(MQ.md, true);
  const cards = !wide && !!renderMobileRow;

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

  const hasRows = data.length > 0;
  // What the body shows.
  const view: BodyView = isLoading ? (hasRows ? "refreshing" : "skeleton") : hasRows ? "rows" : "empty";
  const skeletonRows = Math.min(Math.max(pagination?.size ?? 8, 5), 10);

  const state = <EmptyState title={emptyTitle} description={emptyDescription} className={CARD_BODY_STATE} />;

  // The pager goes only where it says nothing: an empty list on its first
  // page ("Showing 0–0 of 0" over two dead arrows). A page past the end — the
  // last item on page 2 approved, rejected or deleted — keeps it, so
  // Previous still leads back to the rows.
  const showPager = !!pagination && (pagination.totalElements > 0 || pagination.page > 0);

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border border-line bg-surface", className)}
      aria-busy={isLoading || undefined}
    >
      {cards && renderMobileRow ? (
        <>
          {view === "refreshing" && <LoadingBar />}
          <MobileList
            table={table}
            view={view}
            state={state}
            skeletonRows={skeletonRows}
            onRowClick={onRowClick}
            renderMobileRow={renderMobileRow}
          />
        </>
      ) : (
        <DesktopTable
          table={table}
          columnCount={Math.max(columns.length, 1)}
          view={view}
          state={state}
          skeletonRows={skeletonRows}
          onRowClick={onRowClick}
        />
      )}

      {showPager && pagination && <TablePager pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}

type BodyView = "skeleton" | "refreshing" | "rows" | "empty";

/** The empty state is the card's body, not a well nested inside it. */
const CARD_BODY_STATE = "rounded-none bg-transparent py-14";

/** The 2px navy bar that slides along under the header (or the card's top edge) while rows reload. */
function LoadingBar({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 z-[1] h-0.5 overflow-hidden", className)}>
      <div className="h-full w-2/5 rounded-full bg-navy animate-indeterminate" />
    </div>
  );
}

function DesktopTable<TData>({
  table,
  columnCount,
  view,
  state,
  skeletonRows,
  onRowClick,
}: {
  table: Table<TData>;
  columnCount: number;
  view: BodyView;
  state: React.ReactNode;
  skeletonRows: number;
  onRowClick?: (row: TData) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // A table wider than its card (a tablet, a long log line) fades at the
  // edge that has more columns past it.
  useScrollFade(scrollRef, "x");
  const noTable = view === "empty";

  return (
    <div ref={scrollRef} className="custom-scrollbar overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        {/* Column headers over an empty body read as a broken table, so they
            are dropped while there is nothing to label. */}
        <thead hidden={noTable}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-line">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  colSpan={h.colSpan}
                  className={cn(
                    "h-12 whitespace-nowrap px-4 text-left align-middle text-[12.5px] font-semibold text-ink-3 first:pl-6 last:pr-6",
                    metaClasses(h.column),
                  )}
                >
                  {h.isPlaceholder ? null : h.column.getCanSort() ? (
                    <SortButton column={h.column}>{flexRender(h.column.columnDef.header, h.getContext())}</SortButton>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
          {/* The loading bar sits on the header's bottom rule — in the header,
              so a page that hides the header on phones hides it too. */}
          {view === "refreshing" && (
            <tr aria-hidden className="h-0">
              <th colSpan={columnCount} className="relative h-0 p-0">
                <LoadingBar />
              </th>
            </tr>
          )}
        </thead>
        <tbody>
          {view === "skeleton" ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i} className="h-[60px] border-b border-line last:border-0">
                {table.getVisibleLeafColumns().map((column, j) => (
                  <td key={column.id} className={cn("px-4 py-2.5 align-middle first:pl-6 last:pr-6", metaClasses(column))}>
                    {j === 0 ? (
                      <SkeletonPrimary />
                    ) : (
                      <SkeletonBar className={cn(j % 2 ? "w-16" : "w-24", column.columnDef.meta?.align === "right" && "ml-auto")} />
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : noTable ? (
            <tr>
              <td colSpan={columnCount} className="p-0">
                {state}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  // 56px minimum on hairlines; py-2.5 keeps a row with a 40px
                  // thumbnail and a two-line title near 60px. Night hover
                  // steps lighter (paper-2 is darker than the card at night,
                  // and barely showed).
                  "h-14 border-b border-line transition-colors duration-150 last:border-0 hover:bg-paper-2/60 dark:hover:bg-ink/[0.03]",
                  onRowClick && "cursor-pointer hover:bg-paper-2 dark:hover:bg-ink/[0.055]",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn("px-4 py-2.5 align-middle text-ink-2 first:pl-6 last:pr-6", metaClasses(cell.column))}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-2.5 animate-pulse rounded-full bg-ink/7", className)} />;
}

function SkeletonPrimary() {
  return (
    <span aria-hidden className="flex items-center gap-3">
      <span className="size-10 shrink-0 animate-pulse rounded-[12px] bg-ink/6" />
      <span className="flex flex-col gap-2">
        <SkeletonBar className="w-40" />
        <SkeletonBar className="w-24 bg-ink/5" />
      </span>
    </span>
  );
}

/* ---------- Phones: one stacked card per row ---------- */

function MobileList<TData>({
  table,
  view,
  state,
  skeletonRows,
  onRowClick,
  renderMobileRow,
}: {
  table: Table<TData>;
  view: BodyView;
  state: React.ReactNode;
  skeletonRows: number;
  onRowClick?: (row: TData) => void;
  renderMobileRow: (row: TData) => React.ReactNode;
}) {
  if (view === "empty") return <>{state}</>;
  if (view === "skeleton") {
    return (
      <ul aria-hidden className="divide-y divide-line">
        {Array.from({ length: Math.min(skeletonRows, 6) }, (_, i) => (
          <li key={i} className="space-y-3.5 p-4">
            <SkeletonPrimary />
            <span className="grid grid-cols-2 gap-3">
              <SkeletonBar className="w-20" />
              <SkeletonBar className="w-16" />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  // The cards have no header row, so the sortable columns' sort buttons (the
  // same buttons, named by the same header text) sit in a row above them.
  const sortable = table.getHeaderGroups().flatMap((hg) => hg.headers.filter((h) => !h.isPlaceholder && h.column.getCanSort()));
  return (
    <>
      {sortable.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2 text-[12.5px] font-semibold text-ink-3">
          {sortable.map((h) => (
            <SortButton key={h.id} column={h.column}>
              {flexRender(h.column.columnDef.header, h.getContext())}
            </SortButton>
          ))}
        </div>
      )}
      <ul className="divide-y divide-line">
        {table.getRowModel().rows.map((row) => (
          <li
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            className={cn(
              "p-4",
              onRowClick && "cursor-pointer transition-colors active:bg-paper-2 dark:active:bg-ink/[0.055]",
            )}
          >
            {renderMobileRow(row.original)}
          </li>
        ))}
      </ul>
    </>
  );
}

/** A column header's sort toggle: the header text and an arrow for the current direction. */
function SortButton<TData>({ column, children }: { column: Column<TData, unknown>; children: React.ReactNode }) {
  const sort = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "-mx-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-ink/5 hover:text-ink",
        sort && "text-ink",
      )}
    >
      {children}
      {sort === "asc" ? (
        <ArrowUp className="size-3.5 text-navy" />
      ) : sort === "desc" ? (
        <ArrowDown className="size-3.5 text-navy" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-45" />
      )}
    </button>
  );
}

/* ---------- Pager ---------- */

/**
 * The website's pager under a list: "Showing x–y of z" and round numbered
 * page buttons, the current one navy (`.pager` in index.css). DataTable
 * renders it in its footer; lists that are not tables (the booking queues)
 * put it at the bottom of their card:
 *
 *   <TablePager pagination={…} onPageChange={setPage} />
 *
 * Always the same number of buttons once there are more than seven pages, so
 * "next" does not move while you page through.
 */
export function TablePager({
  pagination,
  onPageChange,
  className,
}: {
  pagination: PaginationState;
  onPageChange?: (page: number) => void;
  /** Override the footer padding / rule (defaults: `px-4 sm:px-6 py-3`, a top hairline). */
  className?: string;
}) {
  const { page, size, totalElements, totalPages } = pagination;
  const roomy = useMediaQuery(MQ.sm, true);
  const count = Math.max(totalPages, 1);
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;
  const go = (p: number) => {
    if (p !== page && p >= 0 && p < count) onPageChange?.(p);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:px-6",
        className,
      )}
    >
      <p className="text-[13px] text-ink-3 tabular-nums">
        Showing <span className="font-semibold text-ink">{from}</span>–
        <span className="font-semibold text-ink">{to}</span> of{" "}
        <span className="font-semibold text-ink">{totalElements}</span>
      </p>
      <div className="pager tabular-nums">
        <button type="button" disabled={!canPrev} onClick={() => go(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {pageWindow(page, count, roomy ? 1 : 0).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="text-ink-3">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => go(p)}
            >
              {p + 1}
            </button>
          ),
        )}
        <button type="button" disabled={!canNext} onClick={() => go(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
