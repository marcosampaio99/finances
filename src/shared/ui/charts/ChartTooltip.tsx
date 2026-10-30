import { eur } from "@/shared/lib/format";

export interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
}

// Conteúdo de tooltip comum: o texto usa as cores de texto; a cor da série fica só na amostra.
export function ChartTooltip({
  active,
  payload,
  label,
  labelOf,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  labelOf?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const title = labelOf ? labelOf(String(label)) : label;
  return (
    <div className="tooltip">
      {title && <div className="tooltip-title">{title}</div>}
      {payload.map((entry) => (
        <div className="tooltip-row" key={String(entry.name)}>
          <span className="swatch" style={{ background: entry.color }} />
          {entry.name}
          <b>{eur(Number(entry.value))}</b>
        </div>
      ))}
    </div>
  );
}

export const AXIS_TICK = { fill: "var(--text-3)", fontSize: 12 };
