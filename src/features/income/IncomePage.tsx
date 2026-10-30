import { incomeHooks, type Income } from "@/features/income/income";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { RecordForm } from "@/shared/ui/RecordForm";
import { StatCard } from "@/shared/ui/StatCard";
import { today } from "@/shared/lib/date";
import { eur } from "@/shared/lib/format";
import { sum } from "@/shared/lib/math";

const COLUMNS: Column<Income>[] = [
  { header: "Data", render: (i) => i.date },
  { header: "Descrição", render: (i) => i.description },
  { header: "Valor", numeric: true, className: () => "pos", render: (i) => `+${eur(i.value)}` },
];

export function IncomePage() {
  const income = incomeHooks.useList();
  const add = incomeHooks.useAdd();
  const remove = incomeHooks.useRemove();
  const rows = income.data ?? [];

  return (
    <>
      <div className="grid">
        <StatCard label="Total receitas" tone="pos" value={eur(sum(rows, (i) => i.value))} />
      </div>
      <div className="card">
        <h2>Registar receita</h2>
        <RecordForm
          submitLabel="Registar"
          onSubmit={(v) =>
            add.mutateAsync({
              date: v.date!,
              description: v.description!.trim(),
              value: Number(v.value),
            })
          }
        >
          <input name="date" type="date" defaultValue={today()} required />
          <input name="description" placeholder="Descrição" required />
          <input name="value" type="number" step="0.01" placeholder="Valor" required />
        </RecordForm>
      </div>
      <div className="card">
        <h2>Histórico</h2>
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyMessage="Sem receitas"
          loadFailed={income.isError}
          onDelete={remove.mutateAsync}
        />
      </div>
    </>
  );
}
