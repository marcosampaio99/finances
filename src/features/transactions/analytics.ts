import { budgetStatus, spentInMonth, type Budget } from "@/features/budgets/budgets";
import type { Transaction } from "@/features/transactions/model";
import { addMonths, daysBetween, eachDay, eachMonth } from "@/shared/lib/date";
import { dayLabel, monthShortLabel, pct } from "@/shared/lib/format";
import { sum } from "@/shared/lib/math";

export function monthSummary(transactions: Transaction[], month: string) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  return periodTotals(inMonth);
}

// Transferências movem dinheiro entre contas: nunca são receita nem despesa.
export function periodTotals(transactions: Transaction[]) {
  const income = sum(
    transactions.filter((t) => t.kind === "income"),
    (t) => t.value,
  );
  const expenses = sum(
    transactions.filter((t) => t.kind === "expense"),
    (t) => t.value,
  );
  const savings = income - expenses;
  return { income, expenses, savings, savingsRate: income > 0 ? (savings / income) * 100 : null };
}

export const inRange = (transactions: Transaction[], from: string, to: string) =>
  transactions.filter((t) => t.date >= from && t.date <= to);

export interface CashflowPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
}

// Agrupa por dia em períodos curtos e por mês nos restantes.
export function cashflowSeries(transactions: Transaction[], from: string, to: string): CashflowPoint[] {
  const daily = daysBetween(from, to) <= 45;
  const keys = daily ? eachDay(from, to) : eachMonth(from, to);
  const scoped = inRange(transactions, from, to);
  return keys.map((key) => {
    const { income, expenses, savings } = periodTotals(scoped.filter((t) => t.date.startsWith(key)));
    return { key, label: daily ? dayLabel(key) : monthShortLabel(key), income, expenses, savings };
  });
}

export function categoryBreakdown(transactions: Transaction[], from: string, to: string) {
  const totals = new Map<string, number>();
  inRange(transactions, from, to)
    .filter((t) => t.kind === "expense")
    .forEach((t) => totals.set(t.category, (totals.get(t.category) ?? 0) + t.value));
  return [...totals]
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, label: key, value }));
}

export function monthlyComparison(transactions: Transaction[], from: string, to: string) {
  return eachMonth(from, to).map((month) => {
    const current = monthSummary(transactions, month);
    const previous = monthSummary(transactions, addMonths(month, -1));
    return {
      month,
      ...current,
      expenseChangePct:
        previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : null,
    };
  });
}

export interface Insight {
  id: string;
  text: string;
  tone: "neutral" | "good" | "warn";
}

const MIN_EXPENSES_FOR_SHARE = 3;
const MIN_CHANGE_PCT = 10;

// Cada frase só aparece com dados que a sustentam. Descidas face ao mês anterior não são
// assinaladas: a meio do mês, comparar com um mês completo daria uma falsa boa notícia.
export function buildInsights(transactions: Transaction[], budgets: Budget[], month: string): Insight[] {
  const insights: Insight[] = [];
  const previousMonth = addMonths(month, -1);
  const { expenses, savingsRate } = monthSummary(transactions, month);

  if (savingsRate !== null) {
    insights.push({
      id: "savings",
      text: `A tua taxa de poupança este mês é de ${pct(Math.round(savingsRate))}.`,
      tone: savingsRate >= 0 ? "good" : "warn",
    });
  }

  const current = categoryBreakdown(transactions, `${month}-01`, `${month}-31`);
  const monthExpenses = transactions.filter((t) => t.kind === "expense" && t.date.startsWith(month));
  const top = [...current].sort((a, b) => b.value - a.value)[0];
  if (top && expenses > 0 && monthExpenses.length >= MIN_EXPENSES_FOR_SHARE) {
    insights.push({
      id: "top-category",
      text: `${top.label} representa ${pct(Math.round((top.value / expenses) * 100))} das despesas deste mês.`,
      tone: "neutral",
    });
  }

  const growth = current
    .map((c) => {
      const before = spentInMonth(transactions, previousMonth, c.key);
      return { label: c.label, change: before > 0 ? ((c.value - before) / before) * 100 : 0 };
    })
    .filter((c) => c.change >= MIN_CHANGE_PCT)
    .sort((a, b) => b.change - a.change)[0];
  if (growth) {
    insights.push({
      id: "growth",
      text: `Gastaste mais ${pct(Math.round(growth.change))} em ${growth.label} face ao mês anterior.`,
      tone: "warn",
    });
  }

  const over = budgets.filter((b) => {
    const spent = spentInMonth(transactions, month, b.category);
    return b.limit > 0 && budgetStatus((spent / b.limit) * 100) === "over";
  });
  if (over.length > 0) {
    insights.push({
      id: "budgets",
      text:
        over.length === 1
          ? `Ultrapassaste o orçamento de ${over[0]!.category}.`
          : `Ultrapassaste ${over.length} orçamentos este mês.`,
      tone: "warn",
    });
  }
  return insights;
}
