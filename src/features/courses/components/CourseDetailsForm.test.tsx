import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { store } from "@lib/redux/store";
import { httpClient } from "@lib/axios/httpClient";
import { CourseDetailsForm, type CoursePayload } from "@features/courses/components/CourseDetailsForm";
import type { CourseDto } from "@features/courses/types";

const CATEGORY = "5acf18e6-805d-40dd-bdb5-0c9e53935ad4";

/**
 * A course exactly as `GET /api/admin/courses/{id}` returned it on the dev
 * stack: every unset field is `null`, not absent. Opening this in the form and
 * pressing save used to stop at zod ("Invalid input: expected string, received
 * null") without a request ever being sent.
 */
function apiCourse(overrides: Partial<CourseDto> = {}): CourseDto {
  return {
    id: "4b8d289d-ff2a-464c-bbea-b008db13f2bf",
    slug: "probe-banner",
    title: "Probe banner",
    subtitle: null,
    description: "Plain text from before the editor",
    requirements: null,
    learningOutcomes: null,
    syllabus: "1. Intro\n2. Loops",
    thumbnailMediaId: null,
    trailerMediaId: null,
    courseType: "OFFLINE",
    level: "BEGINNER",
    language: "az",
    free: true,
    price: 0,
    currency: "AZN",
    status: "DRAFT",
    ratingCount: 0,
    enrolledCount: 0,
    tutorId: "805b4405-4376-43dc-a8f7-01a4bed3511e",
    tutors: [],
    categoryIds: [CATEGORY],
    tagIds: [],
    offlineDetails: {
      startDate: "2026-10-10",
      endDate: "2026-10-20",
      startTime: null,
      endTime: null,
      weeklyHours: null,
      totalHours: null,
      studentLimit: 20,
      enrolledCount: 0,
      city: null,
      addressLine: null,
    },
    modules: [],
    ...overrides,
  } as CourseDto;
}

function renderForm(props: Partial<React.ComponentProps<typeof CourseDetailsForm>> = {}) {
  const onSubmit = vi.fn<(values: CoursePayload) => Promise<unknown>>().mockResolvedValue(undefined);
  render(
    <Provider store={store}>
      <CourseDetailsForm onSubmit={onSubmit} submitLabel="Save course" {...props} />
    </Provider>,
  );
  return onSubmit;
}

beforeAll(() => {
  // jsdom has no layout, and the Radix primitives and ProseMirror ask for it.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  // The category picker lists categories; nothing else is fetched here.
  vi.spyOn(httpClient, "request").mockResolvedValue({ data: { data: [] } });
});

describe("CourseDetailsForm", () => {
  it("saves a course loaded straight from the API, nulls and all", async () => {
    const onSubmit = renderForm({ initial: apiCourse(), editing: true });

    await userEvent.click(screen.getByRole("button", { name: "Save course" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const body = onSubmit.mock.calls[0][0];
    expect(body.offlineDetails).toEqual({
      startDate: "2026-10-10",
      endDate: "2026-10-20",
      startTime: undefined,
      endTime: undefined,
      weeklyHours: undefined,
      totalHours: undefined,
      studentLimit: 20,
      city: undefined,
      addressLine: undefined,
    });
    expect(body.thumbnailMediaId).toBeUndefined();
    expect(body.clearThumbnail).toBeUndefined();
    expect(body.clearTrailer).toBeUndefined();
    expect(body.onlineDetails).toBeUndefined();
    // The old free-text syllabus opened as topics, and is kept mirrored.
    expect(body.syllabusItems).toEqual([
      { title: "Intro", description: undefined },
      { title: "Loops", description: undefined },
    ]);
    expect(body.syllabus).toBe("1. Intro\n2. Loops");
  });

  it("sends a one-time course as a single day, leaving the hours to the API", async () => {
    const onSubmit = renderForm({
      initial: apiCourse({
        courseType: "ONE_TIME",
        offlineDetails: {
          startDate: "2026-11-05",
          endDate: "2026-11-05",
          startTime: "10:00:00",
          endTime: "13:30:00",
          weeklyHours: 4,
          totalHours: 3.5,
          studentLimit: 30,
          city: "Bakı",
          addressLine: "AzTU, room 301",
        },
      }),
      editing: true,
    });

    expect(screen.getByText("3.5 hours")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save course" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].offlineDetails).toEqual({
      startDate: "2026-11-05",
      endDate: "2026-11-05",
      startTime: "10:00",
      endTime: "13:30",
      studentLimit: 30,
      city: "Bakı",
      addressLine: "AzTU, room 301",
    });
  });

  it("refuses a one-time course without its times, and says where", async () => {
    const onSubmit = renderForm({
      initial: apiCourse({
        courseType: "ONE_TIME",
        offlineDetails: { startDate: "2026-11-05", endDate: "2026-11-05", studentLimit: 30 },
      }),
      editing: true,
    });

    await userEvent.click(screen.getByRole("button", { name: "Save course" }));

    expect(await screen.findByText("Start time is required")).toBeInTheDocument();
    expect(screen.getByText("End time is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("adds syllabus topics one at a time", async () => {
    const onSubmit = renderForm({ initial: apiCourse({ syllabus: null }), editing: true });

    await userEvent.click(screen.getByRole("button", { name: "Add the first topic" }));
    await userEvent.type(screen.getByLabelText(/Topic 1/), "Variables{Enter}");
    // Enter in a title opens the next topic instead of submitting the course.
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Topic 2/), "Loops");
    await userEvent.click(screen.getAllByRole("button", { name: "Move up" })[1]);

    await userEvent.click(screen.getByRole("button", { name: "Save course" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].syllabusItems?.map((i) => i.title)).toEqual(["Loops", "Variables"]);
  });

  it("asks the API to clear a removed cover", async () => {
    vi.spyOn(httpClient, "get").mockResolvedValue({ data: new Blob(["x"], { type: "image/png" }) });
    URL.createObjectURL = vi.fn(() => "blob:cover");
    URL.revokeObjectURL = vi.fn();
    const onSubmit = renderForm({
      initial: apiCourse({ thumbnailMediaId: "498446bd-dc31-41dc-864b-d615a226160a" }),
      editing: true,
    });

    await userEvent.click(await screen.findByRole("button", { name: "Remove image" }));
    await userEvent.click(screen.getByRole("button", { name: "Save course" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].thumbnailMediaId).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].clearThumbnail).toBe(true);
  });
});
