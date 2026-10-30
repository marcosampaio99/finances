import { BarChart3, Download, Receipt, Scale } from "lucide-react";
import { useNetWorthHistory } from "@/features/finance/netWorthHistory";
import { useFinance } from "@/features/finance/useFinance";
import { AppPageHeader } from "@/features/shell/PageHeader";
import {
  cashflowSeries,
  categoryBreakdown,
  inRange,
  monthlyComparison,
  periodTotals,
} from "@/features/transactions/analytics";
import { CashflowChart, CashflowLegend, useCashflowSeries } from "@/features/transactions/CashflowChart";
import { exportTransactionsCsv } from "@/features/reports/exportCsv";
import { EXPENSE_CATEGORIES } from "@/features/transactions/model";
import { eur, monthLabel, monthShortLabel, pct, signedPct } from "@/shared/lib/format";
import { usePeriod } from "@/shared/lib/period";
import { DonutChart } from "@/shared/ui/charts/DonutChart";
import { TrendChart } from "@/shared/ui/charts/TrendChart";
import { PeriodSelector } from "@/shared/ui/PeriodSelector";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/StatCard";

export function ReportsPage() {
  const { accounts, transactions, isLoading, isError, refetch } = useFinance();
  const netWorth = useNetWorthHistory();
  const { period, setPeriod } = usePeriod();
  const { hidden, toggle } = useCashflowSeries();

  const scoped = inRange(transactions, period.from, period.to);
  const totals = periodTotals(scoped);
  const series = cashflowSeries(transactions, period.from, period.to);
  const categories = categoryBreakdown(transactions, period.from, period.to).sort(
    (a, b) => EXPENSE_CATEGORIES.indexOf(a.key) - EXPENSE_CATEGORIES.indexOf(b.key),
  );
  const months = monthlyComparison(transactions, period.from, period.to);
  const snapshots = netWorth.data ?? [];
  const hasActivity = totals.income > 0 || totals.expenses > 0;

  return (
    <div className="page">
      <AppPageHeader
        title="Relatórios"
        period={<PeriodSelector period={period} onChange={setPeriod} />}
        actions={
          <button
            className="btn"
            disabled={scoped.length === 0}
            onClick={() => exportTransactionsCsv(scoped, accounts, `movimentos_${period.from}_${period.to}.csv`)}
          >
            <Download size={15} /> <span className="quick-label">Exportar CSV</span>
          </button>
        }
      />
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <PageSkeleton stats={4} />
      ) : !hasActivity ? (
        <div className="card">
          <EmptyState icon={BarChart3} title="Sem dados neste período" text="Escolhe um período mais alargado ou regista receitas e despesas." />
        </div>
      ) : (
        <>
          <div className="stats stats-4">
            <StatCard label="Receitas" value={eur(totals.income)} />
            <StatCard label="Despesas" value={eur(totals.expenses)} />
            <StatCard label="Poupança" value={eur(totals.savings)} tone={totals.savings < 0 ? "neg" : undefined} />
            <StatCard label="Taxa de poupança" value={totals.savingsRate === null ? "—" : pct(Math.round(totals.savingsRate))} />
          </div>
          <section className="card">
            <div className="card-head">
              <h2>Receitas e despesas</h2>
              <CashflowLegend hidden={hidden} onToggle={toggle} />
            </div>
            <CashflowChart data={series} hidden={hidden} />
          </section>
          <div className="split split-even">
            <section className="card">
              <div className="card-head">
                <h2>Evolução da poupança</h2>
              </div>
              <TrendChart
                name="Poupança líquida"
                ariaLabel="Poupança líquida ao longo do período"
                data={series.map((p) => ({ label: p.label, value: p.savings }))}
              />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>Despesas por categoria</h2>
              </div>
              {categories.length > 0 ? (
                <DonutChart items={categories} totalLabel="Total do período" ariaLabel="Distribuição das despesas por categoria" />
              ) : (
                <EmptyState compact icon={Receipt} title="Sem despesas neste período" />
              )}
            </section>
          </div>
          <section className="card card-flush">
            <div className="card-head">
              <h2>Comparação mensal</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="right">Receitas</th>
                    <th className="right">Despesas</th>
                    <th className="right">Poupança</th>
                    <th className="right">Taxa</th>
                    <th className="right">Despesas vs. anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td className="nowrap">{monthLabel(m.month).replace(/^./, (c) => c.toUpperCase())}</td>
                      <td className="right">{eur(m.income)}</td>
                      <td className="right">{eur(m.expenses)}</td>
                      <td className={`right ${m.savings < 0 ? "neg" : ""}`}>{eur(m.savings)}</td>
                      <td className="right">{m.savingsRate === null ? "—" : pct(Math.round(m.savingsRate))}</td>
                      <td className="right dim">{m.expenseChangePct === null ? "—" : signedPct(Math.round(m.expenseChangePct))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {!isError && !isLoading && (
        <section className="card">
          <div className="card-head">
            <h2>Evolução do património</h2>
          </div>
          {snapshots.length >= 2 ? (
            <TrendChart
              name="Património líquido"
              ariaLabel="Património líquido registado em cada mês"
              data={snapshots.map((s) => ({ label: monthShortLabel(s.id), value: s.netWorth }))}
            />
          ) : (
            <EmptyState
              compact
              icon={Scale}
              title="O histórico está a começar"
              text="O património é registado mês a mês a partir de agora, quando abres o dashboard. O gráfico aparece a partir do segundo mês, sem reconstruir valores passados."
            />
          )}
        </section>
      )}
    </div>
  );
}
