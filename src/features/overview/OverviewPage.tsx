import { accountHooks, availableBalance, totalAssets } from "@/features/accounts/accounts";
import { AccountsCard } from "@/features/accounts/components/AccountsCard";
import { expenseHooks, monthExpenses } from "@/features/expenses/expenses";
import { StatCard } from "@/shared/ui/StatCard";
import { eur } from "@/shared/lib/format";

export function OverviewPage() {
  const accounts = accountHooks.useList().data ?? [];
  const expenses = expenseHooks.useList().data ?? [];

  return (
    <>
      <div className="grid">
        <StatCard label="Ativos totais" value={eur(totalAssets(accounts))} />
        <StatCard label="Saldo disponível" tone="pos" value={eur(availableBalance(accounts))} />
        <StatCard label="Despesas este mês" tone="neg" value={eur(monthExpenses(expenses))} />
      </div>
      <AccountsCard />
    </>
  );
}
