import { PERIOD_OPTIONS, type Period, type PeriodKey } from "@/shared/lib/period";
import { Segmented } from "@/shared/ui/form";

export function PeriodSelector({
  period,
  onChange,
}: {
  period: Period;
  onChange: (next: { key?: PeriodKey; from?: string; to?: string }) => void;
}) {
  return (
    <div className="period">
      <Segmented
        label="Período"
        options={PERIOD_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        value={period.key}
        onChange={(key) => onChange({ key })}
      />
      {period.key === "custom" && (
        <>
          <input
            className="input"
            type="date"
            aria-label="De"
            value={period.from}
            onChange={(e) => e.target.value && onChange({ from: e.target.value })}
          />
          <input
            className="input"
            type="date"
            aria-label="Até"
            value={period.to}
            onChange={(e) => e.target.value && onChange({ to: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
