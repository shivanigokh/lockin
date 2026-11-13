"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTooltip } from "./theme";

export function LeaderboardChart({ data, unit }: { data: { name: string; value: number; me: boolean }[]; unit: string }) {
  if (!data.some((d) => d.value > 0)) return <p className="text-sm text-muted">No data yet for this period.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} tick={{ fill: "#8d8d96", fontSize: 12 }} />
          <Tooltip {...chartTooltip} formatter={(v) => [`${v} ${unit}`, ""]} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.me ? "#979aff" : "#c6c7ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
