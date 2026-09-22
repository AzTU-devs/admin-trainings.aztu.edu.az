import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";

type Row = { id: string; name: string };
const columns: ColumnDef<Row, unknown>[] = [{ header: "Name", cell: ({ row }) => row.original.name }];
const rows: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Lin" },
];
const pagination = { page: 0, size: 2, totalElements: 4, totalPages: 2 };

describe("DataTable", () => {
  it("keeps the current rows and the pager while a new page loads", () => {
    render(<DataTable data={rows} columns={columns} isLoading pagination={pagination} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
  });

  it("keeps the pager on an empty page past the end, so Previous leads back", async () => {
    // The last pending item on page 2 was approved: page 1 is now past the end.
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={columns}
        emptyTitle="No pending bookings"
        pagination={{ page: 1, size: 10, totalElements: 10, totalPages: 1 }}
        onPageChange={onPageChange}
      />,
    );
    const prev = screen.getByRole("button", { name: "Previous page" });
    expect(prev).toBeEnabled();
    await userEvent.click(prev);
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it("leaves rows clickable while a background refetch runs", async () => {
    const onRowClick = vi.fn();
    render(<DataTable data={rows} columns={columns} isLoading onRowClick={onRowClick} pagination={pagination} />);
    await userEvent.click(screen.getByText("Lin"));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("keeps the sort buttons above the phone cards", async () => {
    // The test environment's matchMedia matches nothing, so this is the phone layout.
    const onSortChange = vi.fn();
    const sortable: ColumnDef<Row, unknown>[] = [{ header: "Name", accessorKey: "name" }];
    render(
      <DataTable
        data={rows}
        columns={sortable}
        onSortChange={onSortChange}
        renderMobileRow={(r) => <span>{r.name}</span>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSortChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
  });

  it("drops the pager under an empty list", () => {
    render(
      <DataTable data={[]} columns={columns} emptyTitle="No users yet" pagination={{ page: 0, size: 10, totalElements: 0, totalPages: 0 }} />,
    );
    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("pages with numbered buttons, the current one marked", async () => {
    const onPageChange = vi.fn();
    render(<DataTable data={rows} columns={columns} pagination={pagination} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
