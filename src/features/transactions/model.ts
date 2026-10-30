import type { DocumentData } from "firebase/firestore";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  Bus,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Repeat,
  RotateCcw,
  Shirt,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";

export type TransactionKind = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  date: string;
  description: string;
  notes: string;
  value: number;
  category: string;
  // Numa transferência, é a conta de origem.
  accountId: string | null;
  toAccountId: string | null;
}

export type TransactionInput = Omit<Transaction, "id">;

export const COLLECTION_BY_KIND: Record<TransactionKind, string> = {
  expense: "expenses",
  income: "income",
  transfer: "transfers",
};

export const KIND_LABELS: Record<TransactionKind, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
};

export const TRANSFER_CATEGORY = "Transferência";
export const DEFAULT_INCOME_CATEGORY = "Outras receitas";

// Os nomes das primeiras categorias vêm da versão original e existem nos dados: não renomear.
export const EXPENSE_CATEGORIES = [
  "Alimentação",
  "Restaurantes/Café",
  "Casa",
  "Transportes",
  "Saúde",
  "Subscrições",
  "Lazer",
  "Viagens",
  "Educação",
  "Roupa/Acessórios",
  "Prendas",
  "Outros",
];

export const INCOME_CATEGORIES = [
  "Salário",
  "Subsídios",
  "Rendimentos de investimento",
  "Reembolsos",
  DEFAULT_INCOME_CATEGORY,
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Alimentação: ShoppingCart,
  "Restaurantes/Café": Coffee,
  Casa: Home,
  Transportes: Bus,
  Saúde: HeartPulse,
  Subscrições: Repeat,
  Lazer: Sparkles,
  Viagens: Plane,
  Educação: GraduationCap,
  "Roupa/Acessórios": Shirt,
  Prendas: Gift,
  Salário: Banknote,
  Subsídios: Landmark,
  "Rendimentos de investimento": TrendingUp,
  Reembolsos: RotateCcw,
  [TRANSFER_CATEGORY]: ArrowLeftRight,
};

export const categoryIcon = (category: string) => CATEGORY_ICONS[category] ?? Tag;

export const transactionKey = (t: Pick<Transaction, "kind" | "id">) => `${t.kind}:${t.id}`;

export const transactionTitle = (t: Transaction) => t.description || t.category;

// Adapta os documentos das três coleções, incluindo receitas antigas sem categoria nem conta.
export function transactionFromDoc(kind: TransactionKind, id: string, data: DocumentData): Transaction {
  const common = {
    id,
    kind,
    date: String(data.date ?? ""),
    description: String(data.description ?? ""),
    notes: String(data.notes ?? ""),
    value: Number(data.value) || 0,
  };
  if (kind === "transfer") {
    return {
      ...common,
      category: TRANSFER_CATEGORY,
      accountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
    };
  }
  return {
    ...common,
    category: data.category || (kind === "income" ? DEFAULT_INCOME_CATEGORY : "Outros"),
    accountId: data.accountId ?? null,
    toAccountId: null,
  };
}

export function transactionToDoc(input: TransactionInput): DocumentData {
  const common = {
    date: input.date,
    description: input.description,
    notes: input.notes,
    value: input.value,
  };
  return input.kind === "transfer"
    ? { ...common, fromAccountId: input.accountId, toAccountId: input.toAccountId }
    : { ...common, category: input.category, accountId: input.accountId };
}

// Dinheiro que entra (+) ou sai (-) de cada conta por causa de um movimento.
export function moneyFlows(t: TransactionInput): { accountId: string; moneyIn: number }[] {
  const flows: { accountId: string; moneyIn: number }[] = [];
  if (t.kind === "expense" && t.accountId) flows.push({ accountId: t.accountId, moneyIn: -t.value });
  if (t.kind === "income" && t.accountId) flows.push({ accountId: t.accountId, moneyIn: t.value });
  if (t.kind === "transfer") {
    if (t.accountId) flows.push({ accountId: t.accountId, moneyIn: -t.value });
    if (t.toAccountId) flows.push({ accountId: t.toAccountId, moneyIn: t.value });
  }
  return flows;
}

// Diferença a aplicar a cada conta ao passar de `previous` para `next` (null = não existe).
export function netFlows(previous: TransactionInput | null, next: TransactionInput | null) {
  const net = new Map<string, number>();
  const add = (accountId: string, amount: number) =>
    net.set(accountId, (net.get(accountId) ?? 0) + amount);
  if (previous) moneyFlows(previous).forEach((f) => add(f.accountId, -f.moneyIn));
  if (next) moneyFlows(next).forEach((f) => add(f.accountId, f.moneyIn));
  return net;
}
