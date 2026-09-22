import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { DataTable } from "./DataTable";
import { renderWithStore } from "@/test/renderWithStore";

const columns = [{ header: "Name", cell: () => "x" }];
const pagination = { page: 0, size: 10, totalElements: 30, totalPages: 3 };

describe("DataTable", () => {
  // Regression: a failed list rendered as "No users yet".
  it("shows the failure, not the empty state, and hides pagination", () => {
    renderWithStore(
      <DataTable data={[]} columns={columns} isError error={{ status: 500, message: "Boom", isNormalized: true }} errorWhat="users" emptyTitle="No users yet" pagination={pagination} />,
    );
    expect(screen.getByText("Couldn't load users")).toBeInTheDocument();
    expect(screen.getByText(/Boom \(HTTP 500\)/)).toBeInTheDocument();
    expect(screen.queryByText("No users yet")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });

  it("tells a 403 to sign in again", () => {
    renderWithStore(<DataTable data={[]} columns={columns} isError error={{ status: 403, message: "Forbidden", isNormalized: true }} />);
    expect(screen.getByText("Your access has changed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
  });
});
