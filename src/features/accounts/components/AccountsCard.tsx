import { accountHooks, ACCOUNT_CATEGORIES, type Account } from "@/features/accounts/accounts";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { RecordForm } from "@/shared/ui/RecordForm";
import { eur } from "@/shared/lib/format";

const COLUMNS: Column<Account>[] = [
  { header: "Conta", render: (a) => a.name },
  { header: "Categoria", render: (a) => a.category },
  { header: "Valor", numeric: true, render: (a) => eur(a.value) },
];

export function AccountsCard() {
  const accounts = accountHooks.useList();
  const add = accountHooks.useAdd();
  const remove = accountHooks.useRemove();

  return (
    <div className="card">
      <h2>Contas e ativos</h2>
      <RecordForm
        submitLabel="Adicionar"
        onSubmit={(v) =>
          add.mutateAsync({
            name: v.name!.trim(),
            category: v.category!,
            value: Number(v.value),
          })
        }
      >
        <input name="name" placeholder="Nome (ex: Santander)" required />
        <select name="category">
          {ACCOUNT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="value" type="number" step="0.01" placeholder="Valor" required />
      </RecordForm>
      <DataTable
        columns={COLUMNS}
        rows={accounts.data ?? []}
        emptyMessage="Sem contas. Adiciona a primeira acima."
        loadFailed={accounts.isError}
        onDelete={remove.mutateAsync}
      />
    </div>
  );
}
