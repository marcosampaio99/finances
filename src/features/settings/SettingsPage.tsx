import { Download } from "lucide-react";
import { useState } from "react";
import { logOut } from "@/features/auth/authService";
import { useFinance } from "@/features/finance/useFinance";
import { exportTransactionsCsv } from "@/features/reports/exportCsv";
import { AppPageHeader } from "@/features/shell/PageHeader";
import { useSession } from "@/shared/auth/session";
import { today } from "@/shared/lib/date";
import { applyTheme, getTheme, type Theme } from "@/shared/lib/theme";
import { Segmented } from "@/shared/ui/form";

export function SettingsPage() {
  const { user } = useSession();
  const { accounts, transactions } = useFinance();
  const [theme, setTheme] = useState<Theme>(getTheme);

  return (
    <div className="page">
      <AppPageHeader title="Definições" />
      <div className="settings">
        <section className="card setting">
          <div>
            <h2>Perfil</h2>
            <p className="dim small">{user?.email}</p>
          </div>
          <button className="btn" onClick={() => logOut()}>
            Terminar sessão
          </button>
        </section>
        <section className="card setting">
          <div>
            <h2>Aparência</h2>
            <p className="dim small">O tema escuro é o tema principal.</p>
          </div>
          <Segmented
            label="Tema"
            value={theme}
            options={[
              { value: "dark", label: "Escuro" },
              { value: "light", label: "Claro" },
            ]}
            onChange={(next) => {
              setTheme(next);
              applyTheme(next);
            }}
          />
        </section>
        <section className="card setting">
          <div>
            <h2>Os teus dados</h2>
            <p className="dim small">Exporta todos os movimentos para CSV (compatível com Excel).</p>
          </div>
          <button
            className="btn"
            disabled={transactions.length === 0}
            onClick={() => exportTransactionsCsv(transactions, accounts, `movimentos_${today()}.csv`)}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Como são feitos os cálculos</h2>
          </div>
          <div className="formula-list">
            <p><b>Património líquido</b> = ativos − passivos, apenas com contas ativas e não excluídas.</p>
            <p><b>Corretoras:</b> com posições associadas, a conta vale a soma do valor atual das posições; sem posições, vale o saldo indicado. Posições sem conta não entram no património, para nunca contar o mesmo valor duas vezes.</p>
            <p><b>Saldo disponível</b> = contas à ordem + dinheiro. Poupança e investimentos ficam de fora.</p>
            <p><b>Poupança do mês</b> = receitas − despesas. <b>Taxa de poupança</b> = poupança ÷ receitas.</p>
            <p><b>Transferências</b> movem saldo entre contas e nunca contam como receita ou despesa.</p>
            <p><b>Investimentos:</b> compras e vendas ajustam a posição pelo custo médio e não alteram saldos de contas. Todos os totais são em EUR, sem conversões automáticas.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
