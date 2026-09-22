import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, AxiosRequestConfig } from "axios";
import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@lib/query/baseApi";
import { httpClient } from "@lib/axios/httpClient";
import { courseDetailTags, coursesApi } from "./coursesApi";
import { modulesApi } from "./modulesApi";
import type { CourseDto, LessonDto, ModuleDto } from "@features/courses/types";

const COURSE_ID = "c0000000-0000-4000-8000-000000000001";
const SLUG = "fixture-empty-online";
const MODULE_ID = "m0000000-0000-4000-8000-000000000001";

describe("courseDetailTags", () => {
  it("tags a loaded course by its id and its slug, whichever key loaded it", () => {
    const course = { id: COURSE_ID, slug: SLUG };
    expect(courseDetailTags(SLUG, course)).toEqual([
      { type: "Course", id: SLUG },
      { type: "Course", id: COURSE_ID },
    ]);
    expect(courseDetailTags(COURSE_ID, course)).toEqual([
      { type: "Course", id: COURSE_ID },
      { type: "Course", id: SLUG },
    ]);
  });

  it("falls back to the lookup key when nothing loaded (404)", () => {
    expect(courseDetailTags("no-such-course")).toEqual([{ type: "Course", id: "no-such-course" }]);
  });
});

/**
 * A tiny in-memory API: one online course, empty until a lesson is added.
 * Counts the course reads so a test can see whether a write refetched it.
 */
function fakeApi() {
  const lessons: LessonDto[] = [];
  const reads = { bySlug: 0, byId: 0 };
  const module = (): ModuleDto => ({ id: MODULE_ID, title: "M", orderIndex: 0, lessons: [...lessons] });
  const course = (): CourseDto =>
    ({
      id: COURSE_ID,
      slug: SLUG,
      title: "Empty online course",
      courseType: "ONLINE",
      status: "DRAFT",
      modules: [module()],
      tutors: [],
    }) as unknown as CourseDto;
  const adapter: AxiosAdapter = async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    let data: unknown = {};
    if (method === "GET" && url === `/public/courses/${SLUG}`) {
      reads.bySlug++;
      data = course();
    } else if (method === "GET" && url === `/admin/courses/${COURSE_ID}`) {
      reads.byId++;
      data = course();
    } else if (method === "GET" && url === `/portal/courses/${COURSE_ID}/modules`) {
      data = [module()];
    } else if (method === "POST" && url === `/portal/modules/${MODULE_ID}/lessons`) {
      const lesson = { id: `l${lessons.length}`, ...JSON.parse(String(config.data)) } as LessonDto;
      lessons.push(lesson);
      data = lesson;
    } else if (method === "DELETE" && url.startsWith("/portal/lessons/")) {
      lessons.splice(0, lessons.length);
      data = null;
    }
    return { data: { data, meta: null, timestamp: "" }, status: 200, statusText: "OK", headers: {}, config: config as never, request: {} };
  };
  return { adapter, reads };
}

const newStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });

const lessonCount = (c?: CourseDto) => c?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;

/** Lets RTK Query process the invalidation and finish the refetch. */
const settle = () => new Promise((r) => setTimeout(r, 30));

describe("content edits refresh the cached course", () => {
  const original = httpClient.defaults.adapter;
  let api: ReturnType<typeof fakeApi>;

  beforeEach(() => {
    api = fakeApi();
    httpClient.defaults.adapter = api.adapter;
  });
  afterAll(() => {
    httpClient.defaults.adapter = original;
  });

  // Regression: the tutor added a module and a lesson, and "Submit for review"
  // still said "This online course has no lessons yet".
  it("the tutor's course, loaded by slug, sees a lesson added by course id", async () => {
    const store = newStore();
    const sub = store.dispatch(coursesApi.endpoints.getCourseBySlug.initiate(SLUG));
    await sub;
    expect(lessonCount(coursesApi.endpoints.getCourseBySlug.select(SLUG)(store.getState()).data)).toBe(0);

    await store.dispatch(
      modulesApi.endpoints.addLesson.initiate({
        courseId: COURSE_ID,
        moduleId: MODULE_ID,
        body: { title: "L", contentType: "TEXT", durationSeconds: 0, orderIndex: 0, preview: false },
      }),
    );
    await settle();
    expect(api.reads.bySlug).toBe(2);
    expect(lessonCount(coursesApi.endpoints.getCourseBySlug.select(SLUG)(store.getState()).data)).toBe(1);

    // And back: deleting the last lesson brings the warning's input back to 0.
    await store.dispatch(modulesApi.endpoints.deleteLesson.initiate({ courseId: COURSE_ID, lessonId: "l0" }));
    await settle();
    expect(lessonCount(coursesApi.endpoints.getCourseBySlug.select(SLUG)(store.getState()).data)).toBe(0);
    sub.unsubscribe();
  });

  it("the admin's course, loaded by id, is refreshed by a write that only names the slug", async () => {
    const store = newStore();
    const sub = store.dispatch(coursesApi.endpoints.getAdminCourseById.initiate(COURSE_ID));
    await sub;
    store.dispatch(baseApi.util.invalidateTags([{ type: "Course", id: SLUG }]));
    await settle();
    expect(api.reads.byId).toBe(2);
    sub.unsubscribe();
  });
});
