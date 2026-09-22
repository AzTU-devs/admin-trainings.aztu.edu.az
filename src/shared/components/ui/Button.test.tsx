import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link } from "react-router";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled while loading and shows a spinner", () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies the danger variant classes", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-error-600");
  });

  // The profile page's "Edit profile" action is exactly this: a Link rendered
  // as a button, with an icon. Slot needs a single child, and the icon used to
  // be passed as a sibling of the Link, so rendering it threw and the error
  // boundary replaced the whole page.
  it("renders as its child with an icon when asChild is set", () => {
    render(
      <MemoryRouter>
        <Button asChild variant="secondary" leftIcon={<svg data-testid="left" />} rightIcon={<svg data-testid="right" />}>
          <Link to="/settings">Edit profile</Link>
        </Button>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Edit profile" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(link).toHaveClass("inline-flex");
    // The icons end up inside the link, around its label — not beside it.
    expect(link).toContainElement(screen.getByTestId("left"));
    expect(link).toContainElement(screen.getByTestId("right"));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Icon-only buttons carry their aria-label as a hover/focus tooltip; that
  // wrapper must work without an app-level TooltipProvider and keep the
  // button's name and click.
  it("keeps an icon button's name and click when it adds its tooltip", async () => {
    const onClick = vi.fn();
    render(
      <Button size="icon" aria-label="Edit" onClick={onClick}>
        <svg />
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // The tooltip only repeats the name, so it must not also be linked as the
  // button's description ("Edit, button, Edit" on a screen reader).
  it("does not describe an icon button by a tooltip that repeats its name", async () => {
    render(
      <Button size="icon" aria-label="Edit">
        <svg />
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Edit" });
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Edit");
    expect(button).not.toHaveAttribute("aria-describedby");
  });

  it("renders as its child without icons when asChild is set", () => {
    render(
      <MemoryRouter>
        <Button asChild>
          <Link to="/x">Go</Link>
        </Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/x");
  });
});
