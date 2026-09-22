import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Breadcrumbs } from "./Breadcrumbs";

const ID = "91bd4646-ccf3-4c90-a055-fa34451529ee";

describe("Breadcrumbs", () => {
  it("names a course id with the page's label", () => {
    render(
      <MemoryRouter initialEntries={[`/admin/courses/${ID}/participants`]}>
        <Breadcrumbs labels={{ [ID]: "Data Science 101" }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Data Science 101" })).toBeInTheDocument();
    expect(screen.getByText("İştirakçilər")).toBeInTheDocument();
  });

  // Regression: an id was humanized into "91bd4646 Ccf3 4c90 A055 Fa34451529ee".
  it("never shows a raw id", () => {
    render(
      <MemoryRouter initialEntries={[`/admin/courses/${ID}`]}>
        <Breadcrumbs />
      </MemoryRouter>,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.queryByText(/Ccf3/)).toBeNull();
  });
});
