import { baseApi } from "@lib/query/baseApi";

export interface AnalyticsOverview {
  activeStudents: number;
  activeTutors: number;
  publishedCourses: number;
  enrollmentsThisMonth: number;
  enrollmentsTrend: { date: string; count: number }[];
  topCourses: { id: number; title: string; enrolledCount: number }[];
  topCategories: { id: number; name: string; courseCount: number }[];
  roomUtilization: { roomId: number; roomName: string; utilizationPct: number }[];
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAnalyticsOverview: build.query<AnalyticsOverview, { range?: "7d" | "30d" | "90d" } | void>({
      query: (params) => ({ url: "/admin/analytics/overview", method: "GET", params: params ?? undefined }),
      providesTags: [{ type: "Analytics", id: "OVERVIEW" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAnalyticsOverviewQuery } = analyticsApi;
