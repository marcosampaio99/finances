import { Navigate, Route, Routes } from "react-router";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { BudgetsPage } from "@/features/budgets/BudgetsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AppLayout } from "@/features/shell/AppLayout";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { useSession } from "@/shared/auth/session";

export function App() {
  const { user, loading } = useSession();

  if (loading) return null;
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transacoes" element={<TransactionsPage />} />
        <Route path="/contas" element={<AccountsPage />} />
        <Route path="/orcamentos" element={<BudgetsPage />} />
        <Route path="/investimentos" element={<InvestmentsPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/definicoes" element={<SettingsPage />} />
        {/* Endereços da versão anterior */}
        <Route path="/despesas" element={<Navigate to="/transacoes?tipo=despesas" replace />} />
        <Route path="/receitas" element={<Navigate to="/transacoes?tipo=receitas" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
