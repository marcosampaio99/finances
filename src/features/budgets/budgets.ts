import type { Transaction } from "@/features/transactions/model";
import { createCollectionHooks } from "@/shared/data/collectionHooks";
import { createUserCollection } from "@/shared/data/userCollection";
import { sum } from "@/shared/lib/math";

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export const budgetHooks = createCollectionHooks(
  "budgets",
  createUserCollection<Budget>("budgets"),
);

export const NEAR_LIMIT_PCT = 85;

export const budgetStatus = (usedPct: number) =>
  usedPct > 100 ? "over" : usedPct >= NEAR_LIMIT_PCT ? "near" : "ok";

// Só as despesas contam: receitas e transferências nunca consomem orçamento.
export function spentInMonth(transactions: Transaction[], month: string, category?: string) {
  return sum(
    transactions.filter(
      (t) =>
        t.kind === "expense" &&
        t.date.startsWith(month) &&
        (category === undefined || t.category === category),
    ),
    (t) => t.value,
  );
}

export function budgetRows(budgets: Budget[], transactions: Transaction[], month: string, previousMonth: string) {
  return budgets
    .map((budget) => {
      const spent = spentInMonth(transactions, month, budget.category);
      return {
        budget,
        spent,
        previous: spentInMonth(transactions, previousMonth, budget.category),
        remaining: budget.limit - spent,
        usedPct: budget.limit > 0 ? (spent / budget.limit) * 100 : 0,
      };
    })
    .sort((a, b) => b.usedPct - a.usedPct);
}
