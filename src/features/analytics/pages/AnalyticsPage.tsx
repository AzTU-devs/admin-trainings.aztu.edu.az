import { useId, useState } from "react";
import { BookOpen, ChartColumn, GraduationCap, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { StatCard } from "@shared/components/data-display/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { cn } from "@shared/lib/cn";
import { useGetAnalyticsOverviewQuery } from "@features/analytics/api/analyticsApi";
import { TrendChart } from "@features/analytics/components/TrendChart";
import { NoData, RoomUtilization, TopCategories, TopCourses } from "@features/analytics/components/Rankings";

type Range = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

/*
 * Stat hues follow the dashboard's subjects (see DashboardPage): people →
 * data (blue), tutors → it (violet), courses → res (pink), enrolments →
 * energy (green) — four different families, one per card.
 */

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isFetching, error } = useGetAnalyticsOverviewQuery({ range });
  const trendTitleId = useId();

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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Active students" value="" Icon={Users} hue="k-data" loading />
            <StatCard label="Active tutors" value="" Icon={GraduationCap} hue="k-it" loading />
            <StatCard label="Published courses" value="" Icon={BookOpen} hue="k-res" loading />
            <StatCard label="Enrollments / month" value="" Icon={TrendingUp} hue="k-energy" loading />
          </div>
          <div className="flex justify-center py-12"><Spinner /></div>
        </div>
      ) : error || !data ? (
        <EmptyState
          Icon={ChartColumn}
          title="No analytics yet"
          description="Once activity starts in the portal, charts will appear here."
        />
      ) : (
        // A range switch keeps the previous figures on screen while the new
        // ones load; dimming them says they are about to change.
        <div aria-busy={isFetching} className={cn("space-y-4 transition-opacity duration-200", isFetching && "opacity-60")}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Active students" value={data.activeStudents.toLocaleString()} Icon={Users} hue="k-data" />
            <StatCard label="Active tutors" value={data.activeTutors.toLocaleString()} Icon={GraduationCap} hue="k-it" />
            <StatCard label="Published courses" value={data.publishedCourses.toLocaleString()} Icon={BookOpen} hue="k-res" />
            <StatCard label="Enrollments / month" value={data.enrollmentsThisMonth.toLocaleString()} Icon={TrendingUp} hue="k-energy" />
          </div>

          {/*
            Three columns only from xl up; with the sidebar open on a laptop a
            third is too narrow for course titles. Between md and xl the wide
            cards take full rows and the two ranked lists pair up (row-dense
            pulls "Top categories" up beside "Top courses").
          */}
          <div className="grid grid-cols-1 gap-4 md:grid-flow-row-dense md:grid-cols-2 xl:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle id={trendTitleId}>Enrollments trend</CardTitle>
                <CardDescription>Last {range}</CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                {data.enrollmentsTrend.length === 0 ? (
                  <NoData />
                ) : (
                  <TrendChart points={data.enrollmentsTrend} days={RANGE_DAYS[range]} labelledBy={trendTitleId} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top courses</CardTitle>
              </CardHeader>
              <CardContent>
                <TopCourses items={data.topCourses} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Room utilization</CardTitle>
                <CardDescription>Percentage of advertised free hours actually booked.</CardDescription>
              </CardHeader>
              <CardContent>
                <RoomUtilization items={data.roomUtilization} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
              </CardHeader>
              <CardContent>
                <TopCategories items={data.topCategories} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
