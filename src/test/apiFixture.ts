import type { AxiosAdapter, AxiosRequestConfig } from "axios";
import coursesJson from "./fixtures/courses.json";
import usersJson from "./fixtures/users.json";
import tutorsJson from "./fixtures/tutors.json";
import categoriesJson from "./fixtures/categories.json";
import roomsJson from "./fixtures/rooms.json";
import meJson from "./fixtures/me.json";
import permissionsJson from "./fixtures/permissions.json";
import type { CourseDto } from "@features/courses/types";
import type { AdminUser } from "@features/users/types";
import type { TutorProfileDto } from "@features/tutors/types";
import type { CategoryDto } from "@features/categories/types";
import type { RoomDto } from "@features/rooms/types";
import type { Role } from "@shared/constants/roles";

/**
 * API responses for render tests, captured from the local dev API with every
 * null kept (see ./fixtures). The nulls are the point: typed as optional, they
 * are exactly what broke "Update course" for most courses while every test,
 * written against hand-made objects without nulls, stayed green.
 */
export const fixtures = {
  courses: coursesJson as unknown as CourseDto[],
  users: usersJson as unknown as AdminUser[],
  tutors: tutorsJson as unknown as TutorProfileDto[],
  categories: categoriesJson as unknown as CategoryDto[],
  rooms: roomsJson as unknown as RoomDto[],
};

/** The course without cover, trailer, subtitle or description. */
export const nullHeavyCourse = fixtures.courses[0];
/** The offline course whose weekly and total hours are null. */
export const offlineCourse = fixtures.courses[1];
/** The course with modules and lessons. */
export const courseWithLessons = fixtures.courses[2];

/** Another expert, the editor of the two courses below. */
const OTHER_TUTOR = { tutorId: "0a0b0c0d-0000-4000-8000-00000000e0e0", displayName: "Other Expert", authorized: true };

/** Edited by another expert; the signed-in tutor is on its roster as a co-tutor. */
export const coTaughtCourse: CourseDto = {
  ...courseWithLessons,
  id: "c0c0c0c0-0000-4000-8000-000000000001",
  slug: "fixture-co-taught",
  title: "Fixture co-taught course",
  status: "PUBLISHED",
  tutorId: OTHER_TUTOR.tutorId,
  tutorDisplayName: OTHER_TUTOR.displayName,
  tutors: [OTHER_TUTOR, { ...courseWithLessons.tutors[0], authorized: false }],
};

/** Somebody else's published course: the signed-in tutor is not on its roster. */
export const othersCourse: CourseDto = {
  ...coTaughtCourse,
  id: "c0c0c0c0-0000-4000-8000-000000000002",
  slug: "fixture-someone-elses",
  title: "Fixture course by someone else",
  tutors: [OTHER_TUTOR],
};

/**
 * One row of every list that shows an API code, so the render tests see each
 * code the way a real page does. "No raw code on screen" is only a claim about
 * pages that have something to show.
 */
const enumSamples = {
  notifications: [
    { id: "n1", templateCode: "course.rejected", channel: "IN_APP", title: "Fixture notification", body: "Body", status: "SENT", sentAt: "2026-09-21T23:11:26Z", readAt: null, createdAt: "2026-09-21T23:11:26Z" },
  ],
  videos: [
    { id: "v1", title: "ready.mp4", filename: "ready.mp4", url: "/api/media/v1/content", durationSeconds: 0, sizeBytes: 37748736, status: "READY", uploadedAt: "2026-09-21T23:34:30Z" },
    { id: "v2", title: "partial.mp4", filename: "partial.mp4", url: "/api/media/v2/content", durationSeconds: 0, sizeBytes: 1024, status: "UPLOADING", uploadedAt: "2026-09-21T23:35:30Z" },
  ],
  securityEvents: [
    { id: "s1", kind: "FAILED_LOGIN", severity: "HIGH", actorEmail: "user@example.com", ipAddress: "10.0.0.1", message: "Failed login attempt", occurredAt: "2026-09-21T23:57:16Z" },
    { id: "s2", kind: "IP_BLOCKED", severity: "HIGH", actorEmail: "sa@example.com", ipAddress: "10.0.0.2", message: "Blocked", occurredAt: "2026-09-21T23:58:16Z" },
  ],
  participants: [
    { enrollmentId: "e1", userId: "u-p1", fullName: "Granted Participant", email: "p1@example.com", avatarUrl: null, status: "ACTIVE", source: "ADMIN_GRANT", enrolledAt: "2026-09-21T19:56:02Z", completedAt: null, progressPercent: 4, lastAccessedAt: null },
    { enrollmentId: "e2", userId: "u-p2", fullName: "Cancelled Participant", email: "p2@example.com", avatarUrl: null, status: "CANCELLED", source: "FREE", enrolledAt: "2026-09-20T19:56:02Z", completedAt: null, progressPercent: 0, lastAccessedAt: null },
  ],
  auditLogs: [
    { id: "a1", actorName: "Fixture Admin", actorEmail: "admin@example.com", action: "LOGIN", resourceType: "USER", resourceId: "u1", ipAddress: "10.0.0.1", occurredAt: "2026-09-22T00:04:21Z" },
    { id: "a2", actorName: "Fixture Admin", actorEmail: "admin@example.com", action: "UPDATE", resourceType: "COURSE_MODULE", resourceId: "m1", ipAddress: "10.0.0.1", occurredAt: "2026-09-22T00:05:21Z" },
  ],
};

/** A lookup the API refuses outright, like /admin/courses/not-a-uuid (400, not 404). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BAD_REQUEST = Symbol("400");

export const permissionsFor = (roles: Role[]): string[] =>
  [...new Set(roles.flatMap((r) => (permissionsJson as Record<string, string[]>)[r] ?? []))].sort();

export interface RecordedWrite {
  method: string;
  url: string;
  body: unknown;
}

const page = <T>(content: T[]) => ({
  content,
  page: 0,
  size: Math.max(content.length, 10),
  totalElements: content.length,
  totalPages: 1,
});

function findCourse(key: string): CourseDto | undefined {
  return [...fixtures.courses, coTaughtCourse, othersCourse].find((c) => c.id === key || c.slug === key);
}

/** GET responses by path. Unknown paths answer an empty page, which every list tolerates. */
function read(url: string, roles: Role[]): unknown {
  const u = url.split("?")[0];
  if (u === "/auth/me") return { ...meJson, roles, permissions: permissionsFor(roles) };
  if (u === "/portal/notifications/unread-count") return { count: 0 };
  if (u === "/admin/categories") return fixtures.categories;
  if (u === "/public/categories") return fixtures.categories.filter((c) => !c.parentId && c.active);
  let m = u.match(/^\/public\/categories\/([^/]+)\/children$/);
  if (m) return fixtures.categories.filter((c) => c.parentId === m![1] && c.active);
  // The signed-in tutor is the editor of the fixture courses; an account with
  // only USER is an applicant whose application was rejected.
  if (u === "/portal/tutor/me") {
    const applicant = roles.length === 1 && roles[0] === "USER";
    return applicant ? fixtures.tutors[2] : { ...fixtures.tutors[0], id: fixtures.courses[0].tutorId };
  }
  if (u === "/portal/tutor/dashboard") return { courses: 3, publishedCourses: 1, students: 2, coursesInReview: 1, approvedBookings: 0 };
  if (u === "/admin/analytics/dashboard") return { totalUsers: 4, pendingTutorApprovals: 1, pendingCourseReviews: 1, publishedCourses: 1, totalRooms: 1, pendingRoomRequests: 0, totalEnrollments: 2 };
  if (u === "/admin/analytics/overview") return { activeStudents: 1, activeTutors: 1, publishedCourses: 1, enrollmentsThisMonth: 1, enrollmentsTrend: [{ date: "2026-09-21", count: 3 }], topCourses: [], topCategories: [], roomUtilization: [] };
  if (u === "/super/system/health") {
    return {
      uptimeSeconds: 10, cpuUsagePct: 1, memoryUsedMb: 1, memoryTotalMb: 2, diskUsedGb: 1, diskTotalGb: 2, appVersion: "test", environment: "test",
      services: [{ name: "application", state: "UP" }, { name: "database", state: "DEGRADED", latencyMs: 900 }],
      recentIncidents: [{ id: 1, title: "Slow database", severity: "MEDIUM", state: "OPEN", startedAt: "2026-09-21T10:00:00Z" }],
    };
  }
  if (u === "/super/security/overview") return { failedLoginsLast24h: 0, lockedAccounts: 0, suspiciousLoginsLast24h: 0, blockedIps: 0, recentEvents: enumSamples.securityEvents, topOffendingIps: [] };
  if (u === "/super/security/events") return page(enumSamples.securityEvents);
  if (u === "/super/audit-logs") return page(enumSamples.auditLogs);
  if (u === "/portal/notifications") return page(enumSamples.notifications);
  if (u === "/videos") return page(enumSamples.videos);
  if (u === "/super/security/blocked-ips") return [];
  if (u === "/admin/users") return page(fixtures.users);
  if (u === "/portal/tutor/admin") return page(fixtures.tutors);
  if (u === "/admin/rooms" || u === "/portal/rooms") return page(fixtures.rooms);
  if (u === "/admin/courses" || u === "/portal/courses") return page(fixtures.courses);
  m = u.match(/^\/admin\/courses\/([^/]+)\/participants$/);
  if (m) return !UUID_RE.test(m[1]) ? BAD_REQUEST : findCourse(m[1]) ? page(enumSamples.participants) : null;
  m = u.match(/^\/admin\/courses\/([^/]+)$/);
  if (m) return !UUID_RE.test(m[1]) ? BAD_REQUEST : (findCourse(m[1]) ?? null);
  m = u.match(/^\/public\/courses\/([^/]+)$/);
  if (m) return findCourse(m[1]) ?? null;
  m = u.match(/^\/portal\/courses\/([^/]+)\/modules$/);
  if (m) return findCourse(m[1])?.modules ?? [];
  if (/pricing-rules$/.test(u)) return [];
  if (/^\/media\//.test(u)) return new Blob(["x"]);
  return page([]);
}

/**
 * An axios adapter answering from the fixtures and recording every write, so a
 * test can assert that a form really sent its request.
 */
export function fixtureAdapter(getRoles: () => Role[], writes: RecordedWrite[]): AxiosAdapter {
  return async (config: AxiosRequestConfig) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    let data: unknown;
    if (method === "GET") {
      data = read(url, getRoles());
    } else {
      const body = typeof config.data === "string" ? JSON.parse(config.data || "null") : config.data;
      writes.push({ method, url, body });
      // Echo a course for course writes, so the form's version bookkeeping sees one.
      const course = url.match(/\/courses\/([^/]+)$/)?.[1];
      data = course ? { ...findCourse(course), version: (findCourse(course)?.version ?? 0) + 1 } : {};
    }
    const status = data === BAD_REQUEST ? 400 : data === null ? 404 : 200;
    const payload =
      status === 400
        ? { status, code: "INVALID_INPUT", message: "Invalid value for 'id'" }
        : status === 404
          ? { status, code: "NOT_FOUND", message: "Not found" }
          : { data, meta: null, timestamp: "" };
    if (status >= 400) {
      const err = Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        config,
        response: { data: payload, status, statusText: "", headers: {}, config },
      });
      throw err;
    }
    return { data: payload, status, statusText: "OK", headers: {}, config: config as never, request: {} };
  };
}
