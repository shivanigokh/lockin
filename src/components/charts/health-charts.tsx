"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { axis, chartTooltip } from "./theme";

const short = (d: string) => format(parseISO(d), "d MMM");

export function WeightChart({ data, target, unit }: { data: { date: string; value: number }[]; target: number | null; unit: string }) {
  if (data.length < 2) return <p className="py-10 text-center text-sm text-muted">Log at least two weigh-ins to see a trend.</p>;
  const values = data.map((d) => d.value).concat(target ? [target] : []);
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);
  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2c2c31" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={24} />
          <YAxis domain={[min, max]} {...axis} width={44} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => short(String(l))} formatter={(v) => [`${v} ${unit}`, "weight"]} />
          {target ? <ReferenceLine y={target} stroke="#ff6ec7" strokeDasharray="6 4" label={{ value: "target", fill: "#ff6ec7", fontSize: 11, position: "insideTopRight" }} /> : null}
          <Line type="monotone" dataKey="value" stroke="#c8ff2e" strokeWidth={2.5} dot={{ r: 3, fill: "#c8ff2e" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyWorkoutsChart({ data }: { data: { week: string; workouts: number; minutes: number }[] }) {
  return (
    <div className="h-44 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2c2c31" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={short} {...axis} minTickGap={16} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => `Week of ${short(String(l))}`} formatter={(v, n) => [v, n === "workouts" ? "workouts" : "minutes"]} />
          <Bar dataKey="workouts" fill="#c8ff2e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HabitTrendChart({ data }: { data: { date: string; pct: number }[] }) {
  return (
    <div className="h-44 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="habitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8a6ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#b8a6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2c2c31" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={24} />
          <YAxis domain={[0, 100]} {...axis} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => short(String(l))} formatter={(v) => [`${v}%`, "habits done"]} />
          <Area type="monotone" dataKey="pct" stroke="#b8a6ff" strokeWidth={2} fill="url(#habitFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MeasurementChart({ data, keys }: { data: Record<string, number | string | null>[]; keys: { key: string; label: string; color: string }[] }) {
  if (data.length < 2) return <p className="py-8 text-center text-sm text-muted">Two or more entries draw a chart.</p>;
  return (
    <div className="h-44 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2c2c31" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={24} />
          <YAxis {...axis} domain={["auto", "auto"]} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => short(String(l))} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
          {keys.map((k) => (
            <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
