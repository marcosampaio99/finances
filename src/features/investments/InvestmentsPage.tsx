import {
  investmentHooks,
  portfolioSummary,
  type Investment,
} from "@/features/investments/investments";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { RecordForm } from "@/shared/ui/RecordForm";
import { StatCard } from "@/shared/ui/StatCard";
import { today } from "@/shared/lib/date";
import { eur, signedEur } from "@/shared/lib/format";

const gain = (i: Investment) => i.current - i.invested;

const COLUMNS: Column<Investment>[] = [
  { header: "Data", render: (i) => i.date },
  { header: "Broker", render: (i) => i.broker },
  { header: "Ativo", render: (i) => i.asset },
  { header: "Investido", numeric: true, render: (i) => eur(i.invested) },
  { header: "Atual", numeric: true, render: (i) => eur(i.current) },
  {
    header: "L/P",
    numeric: true,
    className: (i) => (gain(i) >= 0 ? "pos" : "neg"),
    render: (i) => signedEur(gain(i)),
  },
];

export function InvestmentsPage() {
  const investments = investmentHooks.useList();
  const add = investmentHooks.useAdd();
  const remove = investmentHooks.useRemove();
  const rows = investments.data ?? [];
  const { invested, current, profitLoss } = portfolioSummary(rows);

  return (
    <>
      <div className="grid">
        <StatCard label="Investido" value={eur(invested)} />
        <StatCard label="Valor atual" value={eur(current)} />
        <StatCard
          label="Lucro/Prejuízo"
          tone={profitLoss >= 0 ? "pos" : "neg"}
          value={signedEur(profitLoss)}
        />
      </div>
      <div className="card">
        <h2>Registar posição</h2>
        <RecordForm
          submitLabel="Registar"
          onSubmit={(v) =>
            add.mutateAsync({
              date: v.date!,
              broker: v.broker!.trim(),
              asset: v.asset!.trim(),
              invested: Number(v.invested),
              current: Number(v.current),
            })
          }
        >
          <input name="date" type="date" defaultValue={today()} required />
          <input name="broker" placeholder="Broker" required />
          <input name="asset" placeholder="Ativo" required />
          <input name="invested" type="number" step="0.01" placeholder="Investido" required />
          <input name="current" type="number" step="0.01" placeholder="Valor atual" required />
        </RecordForm>
      </div>
      <div className="card">
        <h2>Posições</h2>
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyMessage="Sem posições"
          loadFailed={investments.isError}
          onDelete={remove.mutateAsync}
        />
      </div>
    </>
  );
}
