import { ChevronLeft, ChevronRight, CircleAlert, Pencil, Plus, Target, Trash2, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppPageHeader } from "@/features/shell/PageHeader";
import { budgetHooks, budgetRows, budgetStatus, spentInMonth, type Budget } from "@/features/budgets/budgets";
import { useFinance } from "@/features/finance/useFinance";
import { CategoryIcon } from "@/features/transactions/CategoryIcon";
import { EXPENSE_CATEGORIES } from "@/features/transactions/model";
import { addMonths, currentMonth } from "@/shared/lib/date";
import { eur, monthLabel, pct, signedPct } from "@/shared/lib/format";
import { sum } from "@/shared/lib/math";
import { Drawer } from "@/shared/ui/Drawer";
import { useAction, useFeedback } from "@/shared/ui/feedback";
import { Field, parseNumber } from "@/shared/ui/form";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/StatCard";

export function BudgetsPage() {
  const { transactions, isLoading: financeLoading, isError: financeError, refetch } = useFinance();
  const budgets = budgetHooks.useList();
  const remove = budgetHooks.useRemove();
  const run = useAction();
  const { confirm } = useFeedback();
  const [month, setMonth] = useState(currentMonth);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);

  const previousMonth = addMonths(month, -1);
  const list = budgets.data ?? [];
  const rows = budgetRows(list, transactions, month, previousMonth);
  const totalLimit = sum(list, (b) => b.limit);
  const totalSpent = sum(rows, (r) => r.spent);
  const totalPrevious = sum(rows, (r) => r.previous);
  const usedPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const unbudgeted = spentInMonth(transactions, month) - totalSpent;

  async function deleteBudget(budget: Budget) {
    const accepted = await confirm({
      title: "Eliminar orçamento?",
      message: `O limite de ${budget.category} será removido. As despesas não são afetadas.`,
    });
    if (!accepted) return;
    await run(() => remove.mutateAsync(budget.id), "Orçamento eliminado", "Não foi possível eliminar. Tenta novamente.");
  }

  const isLoading = financeLoading || budgets.isLoading;
  const isError = financeError || budgets.isError;

  return (
    <div className="page">
      <AppPageHeader
        title="Orçamentos"
        subtitle="Limites mensais por categoria"
        actions={
          <button className="btn" onClick={() => setEditing("new")}>
            <Plus size={15} /> <span className="quick-label">Novo orçamento</span>
          </button>
        }
      />
      {isError ? (
        <ErrorState
          onRetry={() => {
            refetch();
            budgets.refetch();
          }}
        />
      ) : isLoading ? (
        <PageSkeleton stats={4} />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="Define o teu primeiro orçamento"
            text="Escolhe uma categoria e um limite mensal. Os gastos são calculados a partir das tuas despesas."
            action={
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                <Plus size={15} /> Novo orçamento
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div className="period" style={{ width: "auto" }}>
              <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft size={17} />
              </button>
              <h2 style={{ minWidth: 130, textAlign: "center" }}>{monthLabel(month)}</h2>
              <button
                className="icon-btn"
                aria-label="Mês seguinte"
                disabled={month >= currentMonth()}
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="stats stats-4">
            <StatCard label="Total orçamentado" value={eur(totalLimit)} />
            <StatCard label="Total gasto" value={eur(totalSpent)} hint={`${pct(Math.round(usedPct))} utilizado`} />
            <StatCard
              label="Disponível"
              value={eur(totalLimit - totalSpent)}
              tone={totalLimit - totalSpent < 0 ? "neg" : undefined}
            />
            <StatCard
              label="Mês anterior"
              value={eur(totalPrevious)}
              hint={
                totalPrevious > 0
                  ? `${signedPct(Math.round(((totalSpent - totalPrevious) / totalPrevious) * 100))} este mês`
                  : "Sem despesas orçamentadas"
              }
            />
          </div>
          <section className="card card-flush">
            {rows.map(({ budget, spent, previous, remaining, usedPct: used }) => {
              const status = budgetStatus(used);
              return (
                <div className="budget" key={budget.id}>
                  <div className="budget-head">
                    <span className="row-icon">
                      <CategoryIcon category={budget.category} />
                    </span>
                    <div className="row-body">
                      <div className="row-title">{budget.category}</div>
                      <div className="row-meta num">
                        {eur(spent)} / {eur(budget.limit)}
                      </div>
                    </div>
                    {status === "near" && (
                      <span className="badge badge-warn">
                        <TriangleAlert size={12} /> Perto do limite
                      </span>
                    )}
                    {status === "over" && (
                      <span className="badge badge-neg">
                        <CircleAlert size={12} /> Ultrapassado
                      </span>
                    )}
                    <button className="icon-btn" aria-label={`Editar orçamento de ${budget.category}`} onClick={() => setEditing(budget)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn danger" aria-label={`Eliminar orçamento de ${budget.category}`} onClick={() => deleteBudget(budget)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div
                    className={`progress ${status}`}
                    role="progressbar"
                    aria-label={`Utilização de ${budget.category}`}
                    aria-valuenow={Math.round(used)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${Math.min(used, 100)}%` }} />
                  </div>
                  <div className="budget-foot num">
                    <span>
                      {pct(Math.round(used))} · {remaining >= 0 ? `${eur(remaining)} disponíveis` : `${eur(-remaining)} acima do limite`}
                    </span>
                    <span>Mês anterior: {eur(previous)}</span>
                  </div>
                </div>
              );
            })}
          </section>
          {unbudgeted > 0 && (
            <p className="small faint">
              {eur(unbudgeted)} de despesas deste mês estão em categorias sem orçamento.
            </p>
          )}
        </>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Novo orçamento" : "Editar orçamento"}
      >
        {editing && (
          <BudgetForm
            budget={editing === "new" ? null : editing}
            taken={list.map((b) => b.category)}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function BudgetForm({
  budget,
  taken,
  onDone,
}: {
  budget: Budget | null;
  taken: string[];
  onDone: () => void;
}) {
  const add = budgetHooks.useAdd();
  const update = budgetHooks.useUpdate();
  const run = useAction();
  const available = budget ? [budget.category] : EXPENSE_CATEGORIES.filter((c) => !taken.includes(c));
  const [category, setCategory] = useState(budget?.category ?? available[0] ?? "");
  const [limit, setLimit] = useState(budget ? String(budget.limit) : "");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseNumber(limit);
    if (amount === null || amount <= 0) {
      setError("Indica um limite superior a 0.");
      return;
    }
    setError("");
    const saved = await run(
      () =>
        budget
          ? update.mutateAsync({ id: budget.id, patch: { limit: amount } })
          : add.mutateAsync({ category, limit: amount }),
      budget ? "Orçamento atualizado" : "Orçamento criado",
    );
    if (saved) onDone();
  }

  if (available.length === 0) {
    return <p className="dim">Todas as categorias já têm orçamento.</p>;
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Field label="Categoria">
        <select className="select" value={category} disabled={Boolean(budget)} onChange={(e) => setCategory(e.target.value)}>
          {available.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Limite mensal (€)" error={error} hint="Aplica-se a todos os meses.">
        <input className="input" type="number" step="0.01" min="0" inputMode="decimal" autoFocus value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={add.isPending || update.isPending}>
          Guardar
        </button>
      </div>
    </form>
  );
}
