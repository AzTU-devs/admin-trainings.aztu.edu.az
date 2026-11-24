import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpertProfileForm } from "./ExpertProfileForm";
import type { TutorProfileDto } from "@features/tutors/types";

const { CATEGORY } = vi.hoisted(() => ({
  CATEGORY: { id: "c0000000-0000-4000-8000-000000000001", slug: "it", name: "Information Technology", sortOrder: 0, active: true },
}));

vi.mock("@features/categories/api/categoriesApi", () => ({
  useListCategoriesQuery: () => ({ data: [CATEGORY], isLoading: false }),
}));
vi.mock("@shared/api/mediaApi", () => ({
  useUploadMediaMutation: () => [vi.fn()],
  mediaContentUrl: (id: string) => `/api/media/${id}/content`,
}));
vi.mock("@shared/components/upload/ImageUploader", () => ({ ImageUploader: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const YEAR = new Date().getFullYear();

function profile(overrides: Partial<TutorProfileDto> = {}): TutorProfileDto {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    userId: "a0000000-0000-4000-8000-000000000002",
    firstName: "Leyla",
    lastName: "Məmmədova",
    approvalStatus: "APPROVED",
    ratingCount: 0,
    expertiseCategoryIds: [CATEGORY.id],
    ...overrides,
  };
}

function renderForm(saved: TutorProfileDto) {
  const onSave = vi.fn(async (body: object) => ({ ...saved, ...body }) as TutorProfileDto);
  render(<ExpertProfileForm profile={saved} onSave={onSave} />);
  return { onSave, save: () => userEvent.click(screen.getByRole("button", { name: "Save profile" })) };
}

/** One entry's card, by its numbered title ("Education 1"). */
const entry = (title: string) => screen.getByRole("group", { name: title });
const field = (group: HTMLElement, role: "textbox" | "spinbutton", label: RegExp | string) =>
  within(group).getByRole(role, { name: label });

describe("ExpertProfileForm — education", () => {
  it("adds an entry, checks it the API's way, and saves it with Present as null", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(profile());

    expect(screen.getByText("No education added yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add education" }));
    const card = entry("Education 1");
    // The new entry's first field takes the focus.
    expect(field(card, "textbox", /^Institution/)).toHaveFocus();

    await save();
    expect(await within(card).findByText("Enter the institution")).toBeInTheDocument();
    expect(within(card).getByText("Enter the start year")).toBeInTheDocument();
    expect(within(card).getByText("Enter the end year, or tick Present")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(field(card, "textbox", /^Institution/), "  Azerbaijan Technical University ");
    await user.type(field(card, "spinbutton", /^Start year/), "1949");
    await user.type(field(card, "spinbutton", /^End year/), "2012");
    await save();
    expect(await within(card).findByText("1950 or later")).toBeInTheDocument();

    await user.clear(field(card, "spinbutton", /^Start year/));
    await user.type(field(card, "spinbutton", /^Start year/), "2015");
    await save();
    expect(await within(card).findByText("Can't be before the start year")).toBeInTheDocument();

    // Present replaces the end year (its box empties and locks) and clears the message.
    await user.click(within(card).getByRole("checkbox", { name: "Present" }));
    expect(field(card, "spinbutton", /^End year/)).toBeDisabled();
    await waitFor(() => expect(within(card).queryByText("Can't be before the start year")).not.toBeInTheDocument());

    await save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        educationEntries: [
          { institution: "Azerbaijan Technical University", degree: null, startYear: 2015, endYear: null },
        ],
      }),
    );
  });

  it("lets an expected graduation end ahead, up to ten years", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(profile());

    await user.click(screen.getByRole("button", { name: "Add education" }));
    const card = entry("Education 1");
    await user.type(field(card, "textbox", /^Institution/), "ADA University");
    await user.type(field(card, "textbox", "Degree"), "MSc in Data Science");
    await user.type(field(card, "spinbutton", /^Start year/), String(YEAR));
    await user.type(field(card, "spinbutton", /^End year/), String(YEAR + 11));
    await save();
    expect(await within(card).findByText(`${YEAR + 10} at the latest`)).toBeInTheDocument();

    await user.clear(field(card, "spinbutton", /^End year/));
    await user.type(field(card, "spinbutton", /^End year/), String(YEAR + 2));
    await save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        educationEntries: [
          { institution: "ADA University", degree: "MSc in Data Science", startYear: YEAR, endYear: YEAR + 2 },
        ],
      }),
    );
  });

  it("edits a saved entry: its year can be cleared and Present unticked", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(
      profile({ educationEntries: [{ institution: "AzTU", degree: "BSc", startYear: 2010, endYear: null }] }),
    );
    const card = entry("Education 1");

    await user.clear(field(card, "spinbutton", /^Start year/));
    expect(field(card, "spinbutton", /^Start year/)).toHaveValue(null);

    await user.click(within(card).getByRole("checkbox", { name: "Present" }));
    expect(within(card).getByRole("checkbox", { name: "Present" })).not.toBeChecked();
    expect(field(card, "spinbutton", /^End year/)).toBeEnabled();

    await user.type(field(card, "spinbutton", /^Start year/), "2011");
    await user.type(field(card, "spinbutton", /^End year/), "2015");
    await save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        educationEntries: [{ institution: "AzTU", degree: "BSc", startYear: 2011, endYear: 2015 }],
      }),
    );
  });

  it("removes an entry, keeping the others in their order", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(
      profile({
        educationEntries: [
          { institution: "AzTU", degree: null, startYear: 2006, endYear: 2010 },
          { institution: "ADA University", degree: null, startYear: 2010, endYear: 2012 },
          { institution: "METU", degree: "PhD", startYear: 2012, endYear: 2016 },
        ],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Remove education 2" }));
    expect(screen.getByRole("button", { name: "Add education" })).toHaveFocus();
    await save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        educationEntries: [
          { institution: "AzTU", degree: null, startYear: 2006, endYear: 2010 },
          { institution: "METU", degree: "PhD", startYear: 2012, endYear: 2016 },
        ],
      }),
    );
  });

  it("puts focus on Add after removing an entry from a full list", async () => {
    const user = userEvent.setup();
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      institution: `University ${i + 1}`,
      degree: null,
      startYear: 1990 + i,
      endYear: 1991 + i,
    }));
    renderForm(profile({ educationEntries: twenty }));
    const add = screen.getByRole("button", { name: "Add education" });
    expect(add).toBeDisabled();

    // By keyboard, as the focus matters most there: Add is disabled until the removal is rendered.
    screen.getByRole("button", { name: "Remove education 20" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("group", { name: "Education 20" })).not.toBeInTheDocument();
    expect(add).toBeEnabled();
    expect(add).toHaveFocus();
  });

  it("keeps the earlier free-text education editable only on a profile that has it", () => {
    const { unmount } = render(
      <ExpertProfileForm profile={profile({ education: "PhD, AzTU, 2015" })} onSave={vi.fn()} />,
    );
    const legacy = screen.getByRole("textbox", { name: "Earlier education notes" });
    expect(legacy).toHaveValue("PhD, AzTU, 2015");
    expect(screen.getByText(/The public page shows these lines until an entry is added above/)).toBeInTheDocument();
    unmount();

    render(<ExpertProfileForm profile={profile()} onSave={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "Earlier education notes" })).not.toBeInTheDocument();
  });
});

describe("ExpertProfileForm — experience", () => {
  it("asks for the company and position, keeps the end year to this year, and saves the role", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(profile());

    await user.click(screen.getByRole("button", { name: "Add experience" }));
    const card = entry("Experience 1");
    expect(field(card, "textbox", /^Company or organisation/)).toHaveFocus();

    await user.type(field(card, "spinbutton", /^Start year/), "2019");
    await user.type(field(card, "spinbutton", /^End year/), String(YEAR + 1));
    await save();
    expect(await within(card).findByText("Enter the company or organisation")).toBeInTheDocument();
    expect(within(card).getByText("Enter the position")).toBeInTheDocument();
    expect(within(card).getByText(`${YEAR} at the latest — tick Present for a role held now`)).toBeInTheDocument();

    await user.type(field(card, "textbox", /^Company or organisation/), "Azercell");
    await user.type(field(card, "textbox", /^Position/), "Data engineer");
    await user.click(within(card).getByRole("checkbox", { name: "Present" }));
    await user.type(field(card, "textbox", "Description"), "Builds the data platform.");
    await save();

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        experienceEntries: [
          {
            company: "Azercell",
            position: "Data engineer",
            startYear: 2019,
            endYear: null,
            description: "Builds the data platform.",
          },
        ],
      }),
    );
  });

  it("stops adding at twenty entries", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      company: `Company ${i + 1}`,
      position: "Engineer",
      startYear: 2000 + i,
      endYear: 2001 + i,
      description: null,
    }));
    renderForm(profile({ experienceEntries: twenty }));
    expect(screen.getByRole("button", { name: "Add experience" })).toBeDisabled();
    expect(screen.getByText(/That's the most there can be \(20\)/)).toBeInTheDocument();
  });

  it("puts the API's message for a list entry on that entry's field", async () => {
    const saved = profile({
      experienceEntries: [{ company: "Azercell", position: "Engineer", startYear: 2015, endYear: null, description: null }],
    });
    const onSave = vi.fn().mockRejectedValue({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      fieldErrors: [{ field: "experienceEntries[0].position", message: "must not be blank" }],
      isNormalized: true,
    });
    render(<ExpertProfileForm profile={saved} onSave={onSave} />);
    const user = userEvent.setup();

    await user.type(field(entry("Experience 1"), "textbox", /^Position/), " lead");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await within(entry("Experience 1")).findByText("must not be blank")).toBeInTheDocument();
  });
});

describe("ExpertProfileForm — order of the entries", () => {
  const AZTU = { institution: "AzTU", degree: null, startYear: 2006, endYear: 2010 };
  const ADA = { institution: "ADA University", degree: null, startYear: 2010, endYear: 2012 };
  const METU = { institution: "METU", degree: "PhD", startYear: 2012, endYear: 2016 };
  const button = (name: string) => screen.getByRole("button", { name });
  const institution = (title: string) => field(entry(title), "textbox", /^Institution/);

  it("moves an entry, keeps the focus on the button pressed, and saves the new order", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(profile({ educationEntries: [AZTU, ADA, METU] }));

    // Nowhere to go past either end.
    expect(button("Move up: AzTU")).toBeDisabled();
    expect(button("Move down: METU")).toBeDisabled();

    button("Move down: AzTU").focus();
    await user.keyboard("{Enter}");
    expect(institution("Education 1")).toHaveValue("ADA University");
    expect(institution("Education 2")).toHaveValue("AzTU");
    // Still on the same entry's same button, to press again.
    expect(button("Move down: AzTU")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(institution("Education 3")).toHaveValue("AzTU");
    // Last now, so "down" is disabled: the focus is on its "up" instead.
    expect(button("Move down: AzTU")).toBeDisabled();
    expect(button("Move up: AzTU")).toHaveFocus();

    // And back up, all the way: at the top "up" is disabled, so the focus goes to "down".
    await user.keyboard("{Enter}");
    expect(institution("Education 2")).toHaveValue("AzTU");
    expect(button("Move up: AzTU")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(institution("Education 1")).toHaveValue("AzTU");
    expect(button("Move up: AzTU")).toBeDisabled();
    expect(button("Move down: AzTU")).toHaveFocus();

    // By pointer too.
    await user.click(button("Move up: METU"));
    expect(button("Move up: METU")).toHaveFocus();
    expect([1, 2, 3].map((n) => institution(`Education ${n}`))).toEqual([
      expect.objectContaining({ value: "AzTU" }),
      expect.objectContaining({ value: "METU" }),
      expect.objectContaining({ value: "ADA University" }),
    ]);

    await save();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ educationEntries: [AZTU, METU, ADA] }));
  });

  it("tells a screen reader where the entry went", async () => {
    const user = userEvent.setup();
    renderForm(profile({ educationEntries: [AZTU, ADA, METU] }));

    await user.click(button("Move down: ADA University"));
    expect(screen.getByText("ADA University moved to position 3 of 3.")).toHaveAttribute("aria-live", "polite");
  });

  it("names the move buttons after the entry once its name is typed", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(
      profile({
        experienceEntries: [{ company: "Azercell", position: "Engineer", startYear: 2015, endYear: null, description: null }],
      }),
    );

    // A lone entry can't move either way.
    expect(button("Move up: Azercell")).toBeDisabled();
    expect(button("Move down: Azercell")).toBeDisabled();

    await user.click(button("Add experience"));
    // Before its company is typed, the new entry goes by its card's title.
    expect(button("Move up: Experience 2")).toBeEnabled();
    await user.type(field(entry("Experience 2"), "textbox", /^Company or organisation/), "Kapital Bank");
    await user.type(field(entry("Experience 2"), "textbox", /^Position/), "Analyst");
    await user.type(field(entry("Experience 2"), "spinbutton", /^Start year/), "2020");
    await user.click(within(entry("Experience 2")).getByRole("checkbox", { name: "Present" }));

    await user.click(button("Move up: Kapital Bank"));
    expect(field(entry("Experience 1"), "textbox", /^Company or organisation/)).toHaveValue("Kapital Bank");
    expect(button("Move down: Kapital Bank")).toHaveFocus();

    await save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        experienceEntries: [
          { company: "Kapital Bank", position: "Analyst", startYear: 2020, endYear: null, description: null },
          { company: "Azercell", position: "Engineer", startYear: 2015, endYear: null, description: null },
        ],
      }),
    );
  });

  it("keeps the form's messages with the entry they are about", async () => {
    const user = userEvent.setup();
    const { onSave, save } = renderForm(profile({ educationEntries: [AZTU] }));

    await user.click(button("Add education"));
    await user.type(institution("Education 2"), "ADA University");
    await user.type(field(entry("Education 2"), "spinbutton", /^Start year/), "1949");
    await user.type(field(entry("Education 2"), "spinbutton", /^End year/), "2012");
    await save();
    expect(await within(entry("Education 2")).findByText("1950 or later")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(button("Move up: ADA University"));
    // The entry and its message moved together; the other entry has none.
    expect(institution("Education 1")).toHaveValue("ADA University");
    expect(within(entry("Education 1")).getByText("1950 or later")).toBeInTheDocument();
    expect(within(entry("Education 2")).queryByText("1950 or later")).not.toBeInTheDocument();
    expect(field(entry("Education 2"), "spinbutton", /^Start year/)).toHaveValue(2006);

    // Fixed where it now is, it saves in the new order.
    await user.clear(field(entry("Education 1"), "spinbutton", /^Start year/));
    await user.type(field(entry("Education 1"), "spinbutton", /^Start year/), "2010");
    await save();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ educationEntries: [ADA, AZTU] }));
  });

  it("keeps the API's message with the entry it is about", async () => {
    const saved = profile({
      experienceEntries: [
        { company: "Azercell", position: "Engineer", startYear: 2015, endYear: null, description: null },
        { company: "Kapital Bank", position: "Analyst", startYear: 2012, endYear: 2015, description: null },
      ],
    });
    const onSave = vi.fn().mockRejectedValue({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      fieldErrors: [{ field: "experienceEntries[0].position", message: "must not be blank" }],
      isNormalized: true,
    });
    render(<ExpertProfileForm profile={saved} onSave={onSave} />);
    const user = userEvent.setup();

    await user.type(field(entry("Experience 1"), "textbox", /^Position/), " lead");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await within(entry("Experience 1")).findByText("must not be blank")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Move down: Azercell" }));
    expect(field(entry("Experience 2"), "textbox", /^Company or organisation/)).toHaveValue("Azercell");
    expect(within(entry("Experience 2")).getByText("must not be blank")).toBeInTheDocument();
    expect(within(entry("Experience 1")).queryByText("must not be blank")).not.toBeInTheDocument();
  });
});
