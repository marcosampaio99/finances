import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { eur, pct } from "@/shared/lib/format";
import { ChartTooltip } from "@/shared/ui/charts/ChartTooltip";

const MAX_SLICES = 7;
const OTHER_KEY = "__outros";

export interface DonutItem {
  key: string;
  label: string;
  value: number;
}

// As fatias a mais juntam-se em "Restantes". As cores seguem a ordem das entradas recebidas,
// e não o valor, para uma categoria não mudar de cor sempre que passa outra à frente.
function prepareItems(items: DonutItem[]) {
  const ranked = [...items].sort((a, b) => b.value - a.value);
  const fits = ranked.length <= MAX_SLICES;
  const shown = fits ? ranked : ranked.slice(0, MAX_SLICES - 1);
  const shownKeys = new Set(shown.map((i) => i.key));
  const slots = new Map(
    items.filter((i) => shownKeys.has(i.key)).map((item, index) => [item.key, index + 1]),
  );
  const result = shown.map((item) => ({ ...item, color: `var(--series-${slots.get(item.key)})` }));
  if (!fits) {
    const rest = ranked.slice(MAX_SLICES - 1).reduce((total, i) => total + i.value, 0);
    result.push({ key: OTHER_KEY, label: "Restantes", value: rest, color: "var(--series-other)" });
  }
  return result;
}

export function DonutChart({
  items,
  totalLabel,
  ariaLabel,
}: {
  items: DonutItem[];
  totalLabel: string;
  ariaLabel: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const slices = useMemo(() => prepareItems(items), [items]);
  const total = slices.reduce((t, s) => t + s.value, 0);
  const active = slices.find((s) => s.key === selected) ?? null;
  const toggle = (key: string) => setSelected((current) => (current === key ? null : key));

  return (
    <div className="donut">
      <div className="donut-plot" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="74%"
              outerRadius="98%"
              paddingAngle={1}
              stroke="var(--surface)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onClick={(_, index) => {
                const slice = slices[index];
                if (slice) toggle(slice.key);
              }}
            >
              {slices.map((s) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  cursor="pointer"
                  opacity={active && active.key !== s.key ? 0.3 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{eur(active ? active.value : total)}</strong>
          <span>{active ? `${active.label} · ${pct((active.value / total) * 100)}` : totalLabel}</span>
        </div>
      </div>
      <div className="donut-list">
        {slices.map((s) => (
          <button
            key={s.key}
            type="button"
            className="donut-item"
            aria-pressed={selected === s.key}
            onClick={() => toggle(s.key)}
          >
            <span className="swatch" style={{ background: s.color }} />
            <span className="label">{s.label}</span>
            <span className="value">{eur(s.value)}</span>
            <span className="share">{pct(Math.round((s.value / total) * 100))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
