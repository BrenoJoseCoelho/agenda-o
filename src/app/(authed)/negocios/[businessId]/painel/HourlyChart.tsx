"use client";

import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { hour: string; count: number; afterHours: boolean };

export default function HourlyChart({ data }: { data: Point[] }) {
  const { resolvedTheme } = useTheme();

  // Default to dark colors when theme is not yet resolved (matches the app's defaultTheme),
  // so there's no light flash before hydration.
  const isDark = resolvedTheme !== "light";

  const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(14,17,22,0.08)";
  const axis = isDark ? "rgba(255,255,255,0.4)" : "rgba(14,17,22,0.45)";
  const axisLine = isDark ? "rgba(255,255,255,0.1)" : "rgba(14,17,22,0.12)";
  const idleBar = isDark ? "rgba(255,255,255,0.18)" : "rgba(14,17,22,0.15)";
  const tooltipBg = isDark ? "#0d1117" : "#ffffff";
  const tooltipText = isDark ? "#e7ecf2" : "#0e1116";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(14,17,22,0.12)";

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: axis }}
            interval={1}
            axisLine={{ stroke: axisLine }}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axis }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => [`${value} conversa(s)`, "Iniciadas"]}
            labelFormatter={(label) => `${label}h`}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 10,
              color: tooltipText,
            }}
            cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(14,17,22,0.04)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.afterHours ? "#10b981" : idleBar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
