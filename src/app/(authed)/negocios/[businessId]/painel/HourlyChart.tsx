"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { hour: string; count: number; afterHours: boolean };

export default function HourlyChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value} conversa(s)`, "Iniciadas"]}
            labelFormatter={(label) => `${label}h`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.afterHours ? "#10b981" : "#cbd5e1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
