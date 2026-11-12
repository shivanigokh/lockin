export const chartTooltip = {
  cursor: { fill: "rgba(255,255,255,0.04)" },
  contentStyle: {
    background: "#1b1b1e",
    border: "1px solid #2c2c31",
    borderRadius: 12,
    color: "#f3f3ec",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
  },
  labelStyle: { color: "#8d8d96" },
  itemStyle: { color: "#f3f3ec" },
} as const;

export const axis = { tickLine: false, axisLine: false, tick: { fill: "#8d8d96", fontSize: 11 } } as const;
