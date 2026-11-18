"use client";
/**
 * Recharts is the heaviest thing in the bundle (~110 kB). These wrappers load it
 * only on the screens that draw a chart, after the page itself is interactive,
 * and hold the chart's space with a shimmer so nothing jumps.
 */
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

function ChartSkeleton({ className }: { className: string }) {
  return <div className={cn("shimmer rounded-2xl", className)} aria-busy="true" aria-label="Loading chart" />;
}

const health = () => import("./health-charts");

export const WeightChart = dynamic(() => health().then((m) => m.WeightChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-48 sm:h-64" />,
});
export const WeeklyWorkoutsChart = dynamic(() => health().then((m) => m.WeeklyWorkoutsChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-44 sm:h-56" />,
});
export const HabitTrendChart = dynamic(() => health().then((m) => m.HabitTrendChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-44 sm:h-56" />,
});
export const MeasurementChart = dynamic(() => health().then((m) => m.MeasurementChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-44 sm:h-56" />,
});
export const CaloriesChart = dynamic(() => health().then((m) => m.CaloriesChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-44 sm:h-56" />,
});
export const LeaderboardChart = dynamic(() => import("./leaderboard-chart").then((m) => m.LeaderboardChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-56" />,
});
export const UsageChart = dynamic(() => import("./usage-chart").then((m) => m.UsageChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-72" />,
});
export const TypeChart = dynamic(() => import("./usage-chart").then((m) => m.TypeChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-36" />,
});
