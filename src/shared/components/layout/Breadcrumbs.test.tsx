import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Breadcrumbs } from "./Breadcrumbs";

const at = (path: string, recordLabel?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs recordLabel={recordLabel} />
    </MemoryRouter>,
  );

describe("Breadcrumbs", () => {
  it("names each path segment", () => {
    at("/super/api-logs");
    expect(screen.getByText("Api Logs")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Super")).toBeInTheDocument();
  });

  it("shows a course UUID short and in mono, not as words", () => {
    at("/admin/courses/9de8e9e1-46ec-45c2-9477-11fa4f40dd24/participants");
    const id = screen.getByText("9de8e9e1…");
    expect(id).toHaveAttribute("title", "9de8e9e1-46ec-45c2-9477-11fa4f40dd24");
    expect(id).toHaveClass("font-mono");
    expect(screen.getByRole("link", { name: "Courses" })).toHaveAttribute("href", "/admin/courses");
    expect(screen.getByText("Participants")).toBeInTheDocument();
  });

  it("keeps a course slug as it is spelled", () => {
    at("/tutor/courses/smoke-dash-tutor-online-r2");
    expect(screen.getByText("smoke-dash-tutor-online-r2")).toHaveClass("font-mono");
  });

  it("shows the record's name when the page passes one", () => {
    at("/admin/courses/9de8e9e1-46ec-45c2-9477-11fa4f40dd24", "Python basics");
    expect(screen.getByText("Python basics")).toHaveAttribute("aria-current", "page");
  });

  it("keeps 'new' a page, not a record", () => {
    at("/admin/courses/new");
    expect(screen.getByText("New")).toHaveAttribute("aria-current", "page");
  });
});
