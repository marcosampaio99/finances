import { useSearchParams } from "react-router";
import { addMonths, currentMonth, monthStart, today } from "@/shared/lib/date";

export type PeriodKey = "month" | "3m" | "6m" | "year" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "Este mês" },
  { key: "3m", label: "3 meses" },
  { key: "6m", label: "6 meses" },
  { key: "year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
}

export function resolvePeriod(key: PeriodKey, customFrom?: string, customTo?: string): Period {
  const end = today();
  const month = currentMonth();
  switch (key) {
    case "3m":
      return { key, from: monthStart(addMonths(month, -2)), to: end };
    case "6m":
      return { key, from: monthStart(addMonths(month, -5)), to: end };
    case "year":
      return { key, from: `${end.slice(0, 4)}-01-01`, to: end };
    case "custom": {
      const from = customFrom || monthStart(month);
      const to = customTo || end;
      return from <= to ? { key, from, to } : { key, from: to, to: from };
    }
    default:
      return { key: "month", from: monthStart(month), to: end };
  }
}

// O período fica no URL para sobreviver a recarregamentos e poder ser partilhado entre separadores.
export function usePeriod(defaultKey: PeriodKey = "6m") {
  const [params, setParams] = useSearchParams();
  const key = (params.get("periodo") as PeriodKey | null) ?? defaultKey;
  const period = resolvePeriod(key, params.get("de") ?? undefined, params.get("ate") ?? undefined);

  function update(next: { key?: PeriodKey; from?: string; to?: string }) {
    setParams(
      (current) => {
        const result = new URLSearchParams(current);
        result.set("periodo", next.key ?? key);
        if ((next.key ?? key) === "custom") {
          result.set("de", next.from ?? period.from);
          result.set("ate", next.to ?? period.to);
        } else {
          result.delete("de");
          result.delete("ate");
        }
        return result;
      },
      { replace: true },
    );
  }

  return { period, setPeriod: update };
}
