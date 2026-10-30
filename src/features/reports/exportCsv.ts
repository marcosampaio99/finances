import type { Account } from "@/features/accounts/accounts";
import { KIND_LABELS, type Transaction } from "@/features/transactions/model";
import { downloadCsv, toCsv } from "@/shared/lib/csv";

const nameOf = (accounts: Account[], id: string | null) =>
  accounts.find((a) => a.id === id)?.name ?? "";

export function transactionsCsv(transactions: Transaction[], accounts: Account[]) {
  return toCsv(
    ["Data", "Tipo", "Descrição", "Categoria", "Conta", "Conta de destino", "Valor (EUR)", "Notas"],
    transactions.map((t) => [
      t.date,
      KIND_LABELS[t.kind],
      t.description,
      t.category,
      nameOf(accounts, t.accountId),
      nameOf(accounts, t.toAccountId),
      t.value,
      t.notes,
    ]),
  );
}

export const exportTransactionsCsv = (transactions: Transaction[], accounts: Account[], filename: string) =>
  downloadCsv(filename, transactionsCsv(transactions, accounts));
