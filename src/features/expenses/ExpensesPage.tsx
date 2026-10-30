import { accountHooks } from "@/features/accounts/accounts";
import { expenseHooks, EXPENSE_CATEGORIES, type Expense } from "@/features/expenses/expenses";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { RecordForm } from "@/shared/ui/RecordForm";
import { today } from "@/shared/lib/date";
import { eur } from "@/shared/lib/format";

export function ExpensesPage() {
  const accounts = accountHooks.useList().data ?? [];
  const expenses = expenseHooks.useList();
  const add = expenseHooks.useAdd();
  const remove = expenseHooks.useRemove();

  const columns: Column<Expense>[] = [
    { header: "Data", render: (e) => e.date },
    {
      header: "Categoria",
      render: (e) => {
        const account = accounts.find((a) => a.id === e.accountId);
        return account ? `${e.category} · ${account.name}` : e.category;
      },
    },
    { header: "Descrição", render: (e) => e.description },
    { header: "Valor", numeric: true, render: (e) => `-${eur(e.value)}` },
  ];

  return (
    <>
      <div className="card">
        <h2>Registar despesa</h2>
        <RecordForm
          submitLabel="Registar"
          onSubmit={(v) =>
            add.mutateAsync({
              date: v.date!,
              category: v.category!,
              accountId: v.accountId || null,
              description: v.description!.trim(),
              value: Number(v.value),
            })
          }
        >
          <input name="date" type="date" defaultValue={today()} required />
          <select name="category">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="accountId" aria-label="Conta">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            {accounts.length === 0 && <option value="">Adiciona uma conta primeiro</option>}
          </select>
          <input name="description" placeholder="Descrição" />
          <input name="value" type="number" step="0.01" placeholder="Valor" required />
        </RecordForm>
      </div>
      <div className="card">
        <h2>Histórico</h2>
        <DataTable
          columns={columns}
          rows={expenses.data ?? []}
          emptyMessage="Sem despesas"
          loadFailed={expenses.isError}
          onDelete={remove.mutateAsync}
        />
      </div>
    </>
  );
}
