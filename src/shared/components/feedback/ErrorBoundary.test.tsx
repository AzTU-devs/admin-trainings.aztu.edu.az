import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";
import { errorDigest, resetCrashReports } from "./crashReport";

function Boom({ error }: { error: Error }): never {
  throw error;
}

let fetchSpy: ReturnType<typeof vi.fn>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetCrashReports();
  fetchSpy = vi.fn(() => Promise.resolve(new Response("")));
  vi.stubGlobal("fetch", fetchSpy);
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  consoleSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  it("shows an in-page card for a page error", () => {
    render(
      <div>
        <nav>Sidebar</nav>
        <ErrorBoundary variant="page">
          <Boom error={new Error("kaput")} />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument(); // the shell survives
  });

  // "Try again" re-rendered the same lazy import, which fails from React.lazy's
  // cache forever; a missing chunk after a deploy needs a reload.
  it("offers a reload for a chunk that failed to load, and does not report it", () => {
    render(
      <ErrorBoundary variant="page">
        <Boom error={new TypeError("Failed to fetch dynamically imported module: /assets/Users-1a2b.js")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("The portal was updated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.queryByText(/Error ID/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Regression: a production crash was written to the user's console and
  // nowhere else, with nothing the user could quote.
  it("shows an error ID the user can quote and reports the crash once", () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'title')");
    render(
      <ErrorBoundary variant="page">
        <Boom error={error} />
      </ErrorBoundary>,
    );
    const digest = errorDigest(error);
    expect(digest).toMatch(/^E-[0-9A-F]{8}$/);
    expect(screen.getByText(digest)).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchSpy.mock.calls[0][0]), "http://dashboard.test");
    expect(url.pathname).toBe("/client-error");
    expect(url.searchParams.get("id")).toBe(digest);
    expect(url.searchParams.get("msg")).toBe("TypeError: Cannot read properties of undefined (reading 'title')");
    expect(url.searchParams.get("page")).toBe(window.location.pathname);
  });

  it("copies the details: ID, page, message and where it broke", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(
      <ErrorBoundary variant="page">
        <Boom error={new Error("kaput")} />
      </ErrorBoundary>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Copy details" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0];
    const shown = screen.getByText(/^E-[0-9A-F]{8}$/).textContent;
    expect(text).toContain(`Error ID: ${shown}`);
    expect(text).toContain(`Page: ${window.location.pathname}`);
    expect(text).toContain("Error: kaput");
    expect(text).toContain("Components:");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("says so when the clipboard refuses, and keeps the details on screen", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
    render(
      <ErrorBoundary variant="page">
        <Boom error={new Error("kaput")} />
      </ErrorBoundary>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Copy details" }));
    expect(await screen.findByRole("button", { name: "Copy failed, select below" })).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
  });
});

describe("ErrorBoundary helpdesk link", () => {
  it("opens an email to the helpdesk with the error ID in the subject and the details in the body", async () => {
    render(
      <ErrorBoundary variant="page">
        <Boom error={new Error("kaput")} />
      </ErrorBoundary>,
    );
    const link = await screen.findByRole("link", { name: "helpdesk@aztu.edu.az" });
    const shown = screen.getByText(/^E-[0-9A-F]{8}$/).textContent!;
    await waitFor(() => expect(link.getAttribute("href")).toContain("body="));
    const href = new URL(link.getAttribute("href")!);
    expect(href.protocol).toBe("mailto:");
    expect(href.pathname).toBe("helpdesk@aztu.edu.az");
    expect(href.searchParams.get("subject")).toBe(`Dashboard error ${shown}`);
    expect(href.searchParams.get("body")).toContain(`Error ID: ${shown}`);
  });
});
