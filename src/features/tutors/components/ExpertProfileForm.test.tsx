import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpertProfileForm } from "./ExpertProfileForm";
import { AREAS_REQUIRED_MESSAGE } from "@features/tutors/schemas/expertProfile.schema";
import type { TutorProfileDto } from "@features/tutors/types";

const { CATEGORIES } = vi.hoisted(() => ({
  CATEGORIES: [
    { id: "c0000000-0000-4000-8000-000000000001", slug: "information-technology", name: "Information Technology", sortOrder: 0, active: true },
    { id: "c0000000-0000-4000-8000-000000000002", slug: "energy", name: "Energy", sortOrder: 1, active: true },
  ],
}));

// The form's data hooks and the photo uploader are not what is under test.
vi.mock("@features/categories/api/categoriesApi", () => ({
  useListCategoriesQuery: () => ({ data: CATEGORIES, isLoading: false }),
}));
vi.mock("@shared/api/mediaApi", () => ({
  useUploadMediaMutation: () => [vi.fn()],
  mediaContentUrl: (id: string) => `/api/media/${id}/content`,
}));
vi.mock("@shared/components/upload/ImageUploader", () => ({ ImageUploader: () => null }));

// The category picker's Radix checkboxes measure themselves; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function profile(overrides: Partial<TutorProfileDto> = {}): TutorProfileDto {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    userId: "a0000000-0000-4000-8000-000000000002",
    firstName: "Leyla",
    lastName: "Məmmədova",
    approvalStatus: "APPROVED",
    ratingCount: 0,
    expertiseCategoryIds: [CATEGORIES[0].id],
    ...overrides,
  };
}

function renderForm(saved: TutorProfileDto) {
  const onSave = vi.fn(async (body: object) => ({ ...saved, ...body }) as TutorProfileDto);
  render(<ExpertProfileForm profile={saved} onSave={onSave} />);
  return { onSave, box: screen.getByRole("textbox", { name: "Add your own area" }) };
}

describe("ExpertProfileForm — own areas of expertise", () => {
  it("adds an area with Enter without submitting the profile, then saves it", async () => {
    const user = userEvent.setup();
    const { onSave, box } = renderForm(profile());

    await user.type(box, "  Computer   vision {Enter}");
    const own = screen.getByRole("list", { name: "Your own areas" });
    expect(within(own).getByText("Computer vision")).toBeInTheDocument();
    expect(box).toHaveValue("");
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ customExpertise: ["Computer vision"] }));
  });

  it("says why an area can't be added: a picked category's name, a duplicate", async () => {
    const user = userEvent.setup();
    const { box } = renderForm(profile({ customExpertise: ["Robotics"] }));

    await user.type(box, "information technology");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Already picked from the list above")).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "ROBOTICS{Enter}");
    expect(screen.getByText("Already added")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Your own areas" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("removes an area with its chip's button", async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm(profile({ customExpertise: ["Robotics"] }));

    await user.click(screen.getByRole("button", { name: "Remove Robotics" }));
    expect(screen.queryByRole("list", { name: "Your own areas" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ customExpertise: [] }));
  });

  it("asks for at least one area, and an own area answers it", async () => {
    const user = userEvent.setup();
    const { onSave, box } = renderForm(profile({ expertiseCategoryIds: [] }));

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText(AREAS_REQUIRED_MESSAGE)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(box, "Computer vision{Enter}");
    await waitFor(() => expect(screen.queryByText(AREAS_REQUIRED_MESSAGE)).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ customExpertise: ["Computer vision"] }));
  });
});
