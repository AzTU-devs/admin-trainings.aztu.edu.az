import { baseApi } from "@lib/query/baseApi";

/** Tutor dashboard counters — GET /api/portal/tutor/dashboard. */
export interface TutorDashboardDto {
  courses: number;
  publishedCourses: number;
  students: number;
  coursesInReview: number;
  approvedBookings: number;
}

/** Admin dashboard counters — GET /api/admin/analytics/dashboard. */
export interface AdminDashboardDto {
  totalUsers: number;
  pendingTutorApprovals: number;
  pendingCourseReviews: number;
  publishedCourses: number;
  totalRooms: number;
  pendingRoomRequests: number;
  totalEnrollments: number;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTutorDashboard: build.query<TutorDashboardDto, void>({
      query: () => ({ url: "/portal/tutor/dashboard", method: "GET" }),
      providesTags: [{ type: "Analytics", id: "TUTOR-DASHBOARD" }],
    }),
    getAdminDashboard: build.query<AdminDashboardDto, void>({
      query: () => ({ url: "/admin/analytics/dashboard", method: "GET" }),
      providesTags: [{ type: "Analytics", id: "ADMIN-DASHBOARD" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetTutorDashboardQuery, useGetAdminDashboardQuery } = dashboardApi;
