import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import SecurityPage from "./SecurityPage";
import type { BlockedIp } from "@features/security/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const unblock = vi.fn();
let blocked: BlockedIp[] = [];

vi.mock("@features/security/api/securityApi", () => ({
  useGetSecurityOverviewQuery: () => ({
    data: {
      failedLoginsLast24h: 0,
      lockedAccounts: 0,
      suspiciousLoginsLast24h: 0,
      blockedIps: blocked.length,
      recentEvents: [],
      topOffendingIps: [],
    },
    isFetching: false,
  }),
  useListSecurityEventsQuery: () => ({ data: undefined, isFetching: false }),
  useBlockIpMutation: () => [vi.fn()],
  useListBlockedIpsQuery: () => ({ data: blocked, isFetching: false }),
  useUnblockIpMutation: () => [(id: string) => ({ unwrap: () => unblock(id) })],
}));

const LOOPBACK: BlockedIp = {
  id: "b0000000-0000-4000-8000-000000000001",
  ipAddress: "127.0.0.1",
  reason: null,
  createdByEmail: "admin@aztu.edu.az",
  createdAt: "2026-10-25T17:27:43Z",
};
const OFFENDER: BlockedIp = {
  id: "b0000000-0000-4000-8000-000000000002",
  ipAddress: "203.0.113.7",
  reason: "Top offender",
  createdByEmail: "admin@aztu.edu.az",
  createdAt: "2026-11-12T11:34:27Z",
};

function renderPage() {
  render(
    <HelmetProvider>
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

async function openBlockedTab() {
  await userEvent.click(screen.getByRole("tab", { name: "Blocked IPs" }));
}

describe("SecurityPage: blocked IPs", () => {
  beforeEach(() => {
    unblock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    blocked = [LOOPBACK, OFFENDER];
  });

  it("lists every blocked address and marks this server's own as not enforced", async () => {
    renderPage();
    await openBlockedTab();

    const loopback = screen.getByText("127.0.0.1").closest("li")!;
    expect(within(loopback).getByText("Not enforced: this server")).toBeInTheDocument();
    const offender = screen.getByText("203.0.113.7").closest("li")!;
    expect(within(offender).queryByText("Not enforced: this server")).toBeNull();
    expect(within(offender).getByText(/Top offender/)).toBeInTheDocument();
  });

  it("unblocks the chosen address", async () => {
    unblock.mockResolvedValue(undefined);
    renderPage();
    await openBlockedTab();

    await userEvent.click(screen.getByRole("button", { name: "Unblock 127.0.0.1" }));

    expect(unblock).toHaveBeenCalledWith(LOOPBACK.id);
    expect(toast.success).toHaveBeenCalledWith("127.0.0.1 unblocked");
  });

  it("shows the API's reason when unblocking fails", async () => {
    unblock.mockRejectedValue({ status: 404, message: "That block no longer exists", isNormalized: true });
    renderPage();
    await openBlockedTab();

    await userEvent.click(screen.getByRole("button", { name: "Unblock 203.0.113.7" }));

    expect(toast.error).toHaveBeenCalledWith("That block no longer exists");
  });

  it("says so when nothing is blocked", async () => {
    blocked = [];
    renderPage();
    await openBlockedTab();

    expect(screen.getByText("No addresses are blocked.")).toBeInTheDocument();
  });
});
