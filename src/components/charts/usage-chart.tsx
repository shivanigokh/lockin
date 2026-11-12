"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { axis, chartTooltip } from "./theme";

const short = (d: string) => format(parseISO(d), "d MMM");

export function UsageChart({ data }: { data: { date: string; signups: number; active: number; workouts: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2c2c31" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={20} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => short(String(l))} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
          <Bar dataKey="workouts" name="workouts logged" fill="#b8a6ff" radius={[4, 4, 0, 0]} barSize={10} />
          <Line type="monotone" dataKey="active" name="active users" stroke="#c8ff2e" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="signups" name="new sign-ups" stroke="#ff6ec7" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypeChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (!data.length) return <p className="text-sm text-muted">No workouts yet.</p>;
  return (
    <div style={{ height: Math.max(140, data.length * 34) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} {...axis} />
          <Tooltip {...chartTooltip} formatter={(v) => [v, "workouts"]} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} fill="#c8ff2e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
