import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { eurCompact } from "@/shared/lib/format";
import { AXIS_TICK, ChartTooltip } from "@/shared/ui/charts/ChartTooltip";

// Evolução de uma única série ao longo do tempo.
export function TrendChart({
  data,
  name,
  ariaLabel,
  color = "var(--chart-savings)",
}: {
  data: { label: string; value: number }[];
  name: string;
  ariaLabel: string;
  color?: string;
}) {
  return (
    <div className="chart chart-sm" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} tickFormatter={eurCompact} />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--border-strong)" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            dot={data.length <= 12 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
