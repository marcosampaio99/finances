import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/app/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { IncomePage } from "@/features/income/IncomePage";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { useSession } from "@/shared/auth/session";

export function App() {
  const { user, loading } = useSession();

  return (
    <div className="wrap">
      {loading ? null : user ? (
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/despesas" element={<ExpensesPage />} />
            <Route path="/receitas" element={<IncomePage />} />
            <Route path="/investimentos" element={<InvestmentsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <LoginPage />
      )}
    </div>
  );
}
