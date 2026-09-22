import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { httpClient } from "@lib/axios/httpClient";
import { CourseDetailsForm } from "./CourseDetailsForm";
import { fixtureAdapter, nullHeavyCourse, offlineCourse, type RecordedWrite } from "@/test/apiFixture";
import { renderWithStore } from "@/test/renderWithStore";

beforeAll(() => {
  const writes: RecordedWrite[] = [];
  httpClient.defaults.adapter = fixtureAdapter(() => ["ADMIN"], writes);
});

/*
 * Regression: the API sends unset columns as explicit nulls, and the form copied
 * `thumbnailMediaId: null` / `weeklyHours: null` into zod fields that accept
 * only undefined. Validation failed on submit, silently, far below the fold —
 * "Update course" did nothing for 36 of 38 courses.
 */
describe("CourseDetailsForm with the API's nulls", () => {
  it("submits a course with no cover, trailer, subtitle or description", async () => {
    expect(nullHeavyCourse.thumbnailMediaId).toBeNull();
    const onSubmit = vi.fn().mockResolvedValue({ ...nullHeavyCourse, version: 99 });
    renderWithStore(<CourseDetailsForm initial={nullHeavyCourse} editing onSubmit={onSubmit} submitLabel="Update course" />);
    await userEvent.type(screen.getByLabelText("Subtitle"), "Now with a subtitle");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Only the changed field goes, with the version the form was loaded at.
    expect(onSubmit.mock.calls[0][1]).toEqual({ subtitle: "Now with a subtitle", version: nullHeavyCourse.version });

    // The next save is based on the version the first one returned.
    await userEvent.type(screen.getByLabelText("Subtitle"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][1]).toMatchObject({ version: 99 });
  });

  it("submits an offline course whose weekly and total hours are null", async () => {
    expect(offlineCourse.offlineDetails?.weeklyHours).toBeNull();
    const onSubmit = vi.fn().mockResolvedValue(offlineCourse);
    renderWithStore(<CourseDetailsForm initial={offlineCourse} editing onSubmit={onSubmit} submitLabel="Update course" />);
    await userEvent.type(screen.getByLabelText("City"), " centre");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The schedule block goes whole (the API merges it), without the null hours.
    expect(onSubmit.mock.calls[0][1].offlineDetails).toMatchObject({ city: expect.stringContaining("centre") });
    expect(onSubmit.mock.calls[0][1].offlineDetails).not.toHaveProperty("weeklyHours", null);
  });

  it("does not send an unchanged form", async () => {
    const onSubmit = vi.fn();
    renderWithStore(<CourseDetailsForm initial={nullHeavyCourse} editing onSubmit={onSubmit} submitLabel="Update course" />);
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    expect(await screen.findByText("No changes to save")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("says why when validation fails instead of doing nothing", async () => {
    const onSubmit = vi.fn();
    renderWithStore(<CourseDetailsForm initial={nullHeavyCourse} editing onSubmit={onSubmit} submitLabel="Update course" />);
    await userEvent.clear(screen.getByLabelText(/^Title/));
    await userEvent.type(screen.getByLabelText(/^Title/), "  ");
    await userEvent.click(screen.getByRole("button", { name: "Update course" }));
    expect(await screen.findByText("Please fix the highlighted fields")).toBeInTheDocument();
    expect(screen.getAllByText("Title is required").length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
