import type { Account } from "@/features/accounts/accounts";
import { CategoryIcon } from "@/features/transactions/CategoryIcon";
import {
  KIND_LABELS,
  transactionTitle,
  type Transaction,
} from "@/features/transactions/model";
import { dateLabel, eur } from "@/shared/lib/format";

export const accountName = (accounts: Account[], id: string | null) =>
  accounts.find((a) => a.id === id)?.name ?? null;

export function accountLabel(t: Transaction, accounts: Account[]) {
  if (t.kind === "transfer") {
    return `${accountName(accounts, t.accountId) ?? "Conta removida"} → ${
      accountName(accounts, t.toAccountId) ?? "Conta removida"
    }`;
  }
  return accountName(accounts, t.accountId) ?? "Sem conta";
}

export function signedAmount(t: Transaction) {
  if (t.kind === "income") return { text: `+${eur(t.value)}`, className: "pos" };
  if (t.kind === "expense") return { text: `-${eur(t.value)}`, className: "" };
  return { text: eur(t.value), className: "dim" };
}

export function TransactionRow({
  transaction: t,
  accounts,
  onOpen,
}: {
  transaction: Transaction;
  accounts: Account[];
  onOpen: () => void;
}) {
  const amount = signedAmount(t);
  return (
    <button type="button" className="row" onClick={onOpen}>
      <span className="row-icon">
        <CategoryIcon category={t.category} />
      </span>
      <span className="row-body">
        <div className="row-title">{transactionTitle(t)}</div>
        <div className="row-meta">
          {accountLabel(t, accounts)} · {dateLabel(t.date)}
        </div>
      </span>
      <span className="row-end">
        <span className={amount.className}>{amount.text}</span>
        <small>{KIND_LABELS[t.kind]}</small>
      </span>
    </button>
  );
}
