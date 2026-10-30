import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPoint } from "@/features/transactions/analytics";
import { eurCompact } from "@/shared/lib/format";
import { useBalancesHidden } from "@/shared/lib/privacy";
import { AXIS_TICK, ChartTooltip } from "@/shared/ui/charts/ChartTooltip";

const SERIES = [
  { key: "income", label: "Receitas", color: "var(--chart-income)" },
  { key: "expenses", label: "Despesas", color: "var(--chart-expense)" },
  { key: "savings", label: "Poupança líquida", color: "var(--chart-savings)" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

export function CashflowLegend({
  hidden,
  onToggle,
}: {
  hidden: Set<SeriesKey>;
  onToggle: (key: SeriesKey) => void;
}) {
  return (
    <div className="legend">
      {SERIES.map((s) => (
        <button
          key={s.key}
          type="button"
          className="legend-item"
          aria-pressed={!hidden.has(s.key)}
          onClick={() => onToggle(s.key)}
        >
          <span className="swatch" style={{ background: s.color }} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function useCashflowSeries() {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const toggle = (key: SeriesKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { hidden, toggle };
}

export function CashflowChart({ data, hidden }: { data: CashflowPoint[]; hidden: Set<SeriesKey> }) {
  const balancesHidden = useBalancesHidden();
  return (
    <div className="chart" role="img" aria-label="Receitas, despesas e poupança líquida ao longo do período">
      {/* O Recharts guarda as etiquetas dos eixos: a key obriga a refazê-las ao ocultar ou mostrar saldos. */}
      <ResponsiveContainer key={String(balancesHidden)} width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} tickFormatter={eurCompact} />
          <ReferenceLine y={0} stroke="var(--border-strong)" />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
          {!hidden.has("income") && (
            <Bar dataKey="income" name="Receitas" fill="var(--chart-income)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          )}
          {!hidden.has("expenses") && (
            <Bar dataKey="expenses" name="Despesas" fill="var(--chart-expense)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          )}
          {!hidden.has("savings") && (
            <Line
              dataKey="savings"
              name="Poupança líquida"
              stroke="var(--chart-savings)"
              strokeWidth={2}
              dot={data.length <= 12 ? { r: 3, fill: "var(--chart-savings)", strokeWidth: 0 } : false}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
