import type { Account } from "@/features/accounts/accounts";
import { isOpen, type Position } from "@/features/investments/model";
import { sum } from "@/shared/lib/math";

const openPositionsOf = (account: Account, positions: Position[]) =>
  positions.filter((p) => isOpen(p) && p.accountId === account.id);

// Uma corretora com posições associadas vale o que as posições valem; o saldo manual só conta
// enquanto não houver posições. Assim o mesmo investimento nunca é contado duas vezes.
export function accountWorth(account: Account, positions: Position[]) {
  if (account.type === "brokerage") {
    const linked = openPositionsOf(account, positions);
    if (linked.length > 0) return sum(linked, (p) => p.current);
  }
  return account.value;
}

export const isValuedByPositions = (account: Account, positions: Position[]) =>
  account.type === "brokerage" && openPositionsOf(account, positions).length > 0;

const countsForNetWorth = (a: Account) => !a.archived && !a.excludeFromNetWorth;

// Património líquido = ativos - passivos, com base apenas em contas ativas.
export function netWorthSummary(accounts: Account[], positions: Position[]) {
  const counted = accounts.filter(countsForNetWorth);
  const assets = sum(
    counted.filter((a) => a.type !== "liability"),
    (a) => accountWorth(a, positions),
  );
  const liabilities = sum(
    counted.filter((a) => a.type === "liability"),
    (a) => a.value,
  );
  return { assets, liabilities, netWorth: assets - liabilities };
}

// Saldo disponível: dinheiro de uso imediato. Poupança e investimentos ficam de fora.
export const availableBalance = (accounts: Account[]) =>
  sum(
    accounts.filter((a) => countsForNetWorth(a) && (a.type === "checking" || a.type === "cash")),
    (a) => a.value,
  );

// Posições abertas sem corretora ativa não entram no património, porque o seu valor pode já estar
// no saldo de uma conta. A interface assinala-as para o utilizador as associar.
export function unlinkedPositions(accounts: Account[], positions: Position[]) {
  const active = new Set(accounts.filter((a) => !a.archived).map((a) => a.id));
  return positions.filter((p) => isOpen(p) && !(p.accountId && active.has(p.accountId)));
}
