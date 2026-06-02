import { useState } from "react";
import { BookOpen, GraduationCap, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { StatCard } from "@shared/components/data-display/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { useGetAnalyticsOverviewQuery } from "@features/analytics/api/analyticsApi";

type Range = "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isFetching, error } = useGetAnalyticsOverviewQuery({ range });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Operational overview of courses, tutors and enrollments."
        actions={
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isFetching && !data ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error || !data ? (
        <EmptyState title="No analytics yet" description="Once activity starts in the portal, charts will appear here." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard label="Active students" value={data.activeStudents.toLocaleString()} Icon={Users} accent="brand" />
            <StatCard label="Active tutors" value={data.activeTutors.toLocaleString()} Icon={GraduationCap} accent="gold" />
            <StatCard label="Published courses" value={data.publishedCourses.toLocaleString()} Icon={BookOpen} accent="success" />
            <StatCard label="Enrollments / month" value={data.enrollmentsThisMonth.toLocaleString()} Icon={TrendingUp} accent="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Enrollments trend</CardTitle>
                <CardDescription>Last {range}</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart points={data.enrollmentsTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top courses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data.topCourses.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                  {data.topCourses.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{c.title}</span>
                      <span className="text-xs font-medium text-brand-700 dark:text-brand-300">{c.enrolledCount}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Room utilization</CardTitle>
                <CardDescription>Percentage of advertised free hours actually booked.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data.roomUtilization.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                  {data.roomUtilization.map((r) => (
                    <li key={r.roomId} className="flex items-center gap-3">
                      <span className="text-sm text-gray-900 dark:text-gray-100 w-40 truncate">{r.roomName}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-brand-700" style={{ width: `${r.utilizationPct}%` }} />
                      </div>
                      <span className="text-xs w-12 text-right text-gray-600 dark:text-gray-300">{r.utilizationPct}%</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data.topCategories.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                  {data.topCategories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
                      <span className="text-xs font-medium text-aztu-gold-700 dark:text-aztu-gold-300">{c.courseCount}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/** Lightweight inline trend chart — no extra deps. */
function TrendChart({ points }: { points: { date: string; count: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No data.</p>;
  }
  const max = Math.max(...points.map((p) => p.count), 1);
  const w = 600;
  const h = 180;
  const pad = 24;
  const stepX = (w - pad * 2) / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((p.count / max) * (h - pad * 2));
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L ${pad + (points.length - 1) * stepX} ${h - pad} L ${pad} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="aztuArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#003876" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#003876" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#aztuArea)" />
      <path d={path} fill="none" stroke="#003876" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
