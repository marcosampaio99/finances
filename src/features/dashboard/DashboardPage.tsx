import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  Info,
  Landmark,
  LineChart,
  PiggyBank,
  Plus,
  Receipt,
  Scale,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { accountTypeLabel } from "@/features/accounts/accounts";
import { budgetHooks } from "@/features/budgets/budgets";
import {
  accountWorth,
  availableBalance,
  netWorthSummary,
  unlinkedPositions,
} from "@/features/finance/metrics";
import { useRecordNetWorth } from "@/features/finance/netWorthHistory";
import { useFinance } from "@/features/finance/useFinance";
import { portfolioSummary } from "@/features/investments/model";
import { AppPageHeader } from "@/features/shell/PageHeader";
import {
  buildInsights,
  cashflowSeries,
  categoryBreakdown,
  monthSummary,
} from "@/features/transactions/analytics";
import { CashflowChart, CashflowLegend, useCashflowSeries } from "@/features/transactions/CashflowChart";
import { EXPENSE_CATEGORIES, transactionKey } from "@/features/transactions/model";
import { useTransactionEditor } from "@/features/transactions/TransactionEditor";
import { TransactionRow } from "@/features/transactions/TransactionRow";
import { addMonths, currentMonth } from "@/shared/lib/date";
import { eur, pct, signedPct } from "@/shared/lib/format";
import { usePeriod } from "@/shared/lib/period";
import { DonutChart } from "@/shared/ui/charts/DonutChart";
import { PeriodSelector } from "@/shared/ui/PeriodSelector";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/StatCard";

const orderByCategory = <T extends { key: string }>(items: T[]) =>
  [...items].sort((a, b) => EXPENSE_CATEGORIES.indexOf(a.key) - EXPENSE_CATEGORIES.indexOf(b.key));

function changeHint(current: number, previous: number) {
  if (previous <= 0) return "Sem dados do mês anterior";
  return `${signedPct(Math.round(((current - previous) / previous) * 100))} face ao mês anterior`;
}

export function DashboardPage() {
  const { accounts, positions, transactions, isLoading, isError, refetch } = useFinance();
  const budgets = budgetHooks.useList().data ?? [];
  const { period, setPeriod } = usePeriod();
  const editor = useTransactionEditor();
  const navigate = useNavigate();
  const { hidden, toggle } = useCashflowSeries();

  const summary = netWorthSummary(accounts, positions);
  useRecordNetWorth(summary, !isLoading && !isError);

  const header = (
    <AppPageHeader title="Dashboard" period={<PeriodSelector period={period} onChange={setPeriod} />} />
  );

  if (isError) return <div className="page">{header}<ErrorState onRetry={refetch} /></div>;
  if (isLoading) return <div className="page">{header}<PageSkeleton /></div>;

  if (accounts.length === 0 && transactions.length === 0 && positions.length === 0) {
    return (
      <div className="page">
        {header}
        <div className="card">
          <EmptyState
            icon={Wallet}
            title="Começa por adicionar uma conta"
            text="O dashboard é construído apenas com os teus dados. Adiciona uma conta e regista os primeiros movimentos."
            action={
              <button className="btn btn-primary" onClick={() => navigate("/contas")}>
                <Plus size={15} /> Adicionar conta
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const month = currentMonth();
  const thisMonth = monthSummary(transactions, month);
  const lastMonth = monthSummary(transactions, addMonths(month, -1));
  const portfolio = portfolioSummary(positions);
  const unlinked = unlinkedPositions(accounts, positions);
  const series = cashflowSeries(transactions, period.from, period.to);
  const hasActivity = series.some((p) => p.income > 0 || p.expenses > 0);
  const categories = orderByCategory(categoryBreakdown(transactions, period.from, period.to));
  const insights = buildInsights(transactions, budgets, month);
  const activeAccounts = accounts.filter((a) => !a.archived);

  return (
    <div className="page">
      {header}
      <div className="stats">
        <StatCard
          label="Património líquido"
          icon={Scale}
          value={eur(summary.netWorth)}
          hint={summary.liabilities > 0 ? `${eur(summary.assets)} em ativos − ${eur(summary.liabilities)} em passivos` : "Ativos menos passivos"}
        />
        <StatCard label="Saldo disponível" icon={Wallet} value={eur(availableBalance(accounts))} hint="Contas à ordem e dinheiro" />
        <StatCard
          label="Valor do portefólio"
          icon={LineChart}
          value={eur(portfolio.current)}
          hint={portfolio.returnPct === null ? "Sem capital investido" : `${signedPct(Math.round(portfolio.returnPct * 10) / 10)} de rentabilidade`}
        />
        <StatCard label="Receitas do mês" icon={ArrowDownLeft} value={eur(thisMonth.income)} hint={changeHint(thisMonth.income, lastMonth.income)} />
        <StatCard label="Despesas do mês" icon={ArrowUpRight} value={eur(thisMonth.expenses)} hint={changeHint(thisMonth.expenses, lastMonth.expenses)} />
        <StatCard
          label="Poupança do mês"
          icon={PiggyBank}
          value={eur(thisMonth.savings)}
          tone={thisMonth.savings < 0 ? "neg" : undefined}
          hint={thisMonth.savingsRate === null ? "Sem receitas este mês" : `Taxa de poupança de ${pct(Math.round(thisMonth.savingsRate))}`}
        />
      </div>

      {unlinked.length > 0 && (
        <div className="notice">
          <CircleAlert size={16} />
          <span>
            {unlinked.length === 1 ? "1 posição sem conta de corretora fica" : `${unlinked.length} posições sem conta de corretora ficam`}{" "}
            fora do património para evitar dupla contagem. <Link to="/investimentos">Associar</Link>.
          </span>
        </div>
      )}

      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>Evolução financeira</h2>
            <CashflowLegend hidden={hidden} onToggle={toggle} />
          </div>
          {hasActivity ? (
            <CashflowChart data={series} hidden={hidden} />
          ) : (
            <EmptyState icon={Receipt} title="Sem movimentos neste período" text="Regista receitas e despesas ou escolhe outro período." />
          )}
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

      <div className="split split-even">
        <section className="card">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <h2>Transações recentes</h2>
            <Link to="/transacoes" className="link">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>
          {transactions.length > 0 ? (
            <div className="rows">
              {transactions.slice(0, 6).map((t) => (
                <TransactionRow key={transactionKey(t)} transaction={t} accounts={accounts} onOpen={() => editor.details(t)} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Receipt}
              title="Ainda não há movimentos"
              action={
                <button className="btn" onClick={() => editor.create()}>
                  <Plus size={15} /> Novo movimento
                </button>
              }
            />
          )}
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <section className="card">
            <div className="card-head" style={{ marginBottom: 4 }}>
              <h2>Contas</h2>
              <Link to="/contas" className="link">
                Gerir <ChevronRight size={14} />
              </Link>
            </div>
            {activeAccounts.length > 0 ? (
              <div className="rows">
                {activeAccounts.map((account) => {
                  const worth = accountWorth(account, positions);
                  const isDebt = account.type === "liability";
                  return (
                    <div className="row" key={account.id}>
                      <span className="row-body">
                        <div className="row-title">{account.name}</div>
                        <div className="row-meta">{accountTypeLabel(account.type)}</div>
                      </span>
                      <span className="row-end">
                        <span className={isDebt ? "neg" : undefined}>{isDebt ? `-${eur(worth)}` : eur(worth)}</span>
                        <small>
                          {account.excludeFromNetWorth
                            ? "Fora do património"
                            : isDebt
                              ? "Passivo"
                              : summary.assets > 0
                                ? `${pct(Math.round((worth / summary.assets) * 100))} dos ativos`
                                : ""}
                        </small>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState compact icon={Landmark} title="Sem contas ativas" />
            )}
          </section>
          {insights.length > 0 && (
            <section className="card">
              <div className="card-head" style={{ marginBottom: 4 }}>
                <h2>Insights</h2>
              </div>
              {insights.map((insight) => (
                <div className={`insight ${insight.tone}`} key={insight.id}>
                  {insight.tone === "warn" ? <TriangleAlert size={15} /> : insight.tone === "good" ? <Sparkles size={15} /> : <Info size={15} />}
                  {insight.text}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
