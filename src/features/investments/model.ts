import type { DocumentData } from "firebase/firestore";
import { roundCents, sum } from "@/shared/lib/math";

export type AssetType = "stock" | "etf" | "bond" | "crypto" | "fund" | "other";

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Ações" },
  { value: "etf", label: "ETF" },
  { value: "bond", label: "Obrigações" },
  { value: "crypto", label: "Criptomoedas" },
  { value: "fund", label: "Fundos" },
  { value: "other", label: "Outros" },
];

export const assetTypeLabel = (type: AssetType) =>
  ASSET_TYPES.find((t) => t.value === type)?.label ?? type;

// Posição: o que se detém agora. `invested` é o custo do que ainda se detém e `current`
// o valor atual, ambos sempre em EUR. A moeda e o preço médio descrevem a cotação do ativo.
export interface Position {
  id: string;
  date: string;
  broker: string;
  asset: string;
  ticker: string;
  assetType: AssetType;
  quantity: number | null;
  avgPrice: number | null;
  currency: string;
  invested: number;
  current: number;
  accountId: string | null;
}

export type PositionInput = Omit<Position, "id">;

// Operação: uma compra ou venda que aconteceu.
export interface Operation {
  id: string;
  positionId: string;
  kind: "buy" | "sell";
  date: string;
  quantity: number;
  price: number;
  amount: number;
  realizedPL: number | null;
}

// Valorização: o valor de uma posição numa data. Nunca é estimada.
export interface Valuation {
  id: string;
  positionId: string;
  date: string;
  value: number;
}

// Posições criadas na versão original só têm data, corretora, ativo, investido e atual.
export function positionFromDoc(id: string, data: DocumentData): Position {
  const known = ASSET_TYPES.some((t) => t.value === data.assetType);
  return {
    id,
    date: String(data.date ?? ""),
    broker: String(data.broker ?? ""),
    asset: String(data.asset ?? ""),
    ticker: String(data.ticker ?? ""),
    assetType: known ? data.assetType : "other",
    quantity: data.quantity ?? null,
    avgPrice: data.avgPrice ?? null,
    currency: String(data.currency ?? "EUR"),
    invested: Number(data.invested) || 0,
    current: Number(data.current) || 0,
    accountId: data.accountId ?? null,
  };
}

export const isOpen = (p: Position) => p.quantity !== 0;

const roundQuantity = (n: number) => Math.round(n * 1e8) / 1e8;

export interface OperationInput {
  kind: "buy" | "sell";
  date: string;
  quantity: number;
  price: number;
  amount: number;
}

// Sem quantidade conhecida não há custo médio correto, por isso a operação é recusada.
export function applyOperation(position: Position, op: OperationInput) {
  const held = position.quantity;
  if (held === null) throw new Error("A posição não tem quantidade definida.");

  if (op.kind === "buy") {
    const quantity = roundQuantity(held + op.quantity);
    const avgPrice =
      held > 0 && position.avgPrice !== null
        ? (held * position.avgPrice + op.quantity * op.price) / quantity
        : op.price;
    return {
      patch: {
        quantity,
        avgPrice,
        invested: roundCents(position.invested + op.amount),
        // Até à próxima valorização, o que se comprou vale o que custou.
        current: roundCents(position.current + op.amount),
      },
      realizedPL: null,
    };
  }

  if (op.quantity > held) throw new Error("A quantidade vendida excede a detida.");
  const remaining = roundQuantity(held - op.quantity);
  const soldShare = op.quantity / held;
  const costSold = remaining === 0 ? position.invested : roundCents(position.invested * soldShare);
  return {
    patch: {
      quantity: remaining,
      avgPrice: position.avgPrice,
      invested: roundCents(position.invested - costSold),
      current: remaining === 0 ? 0 : roundCents(position.current * (1 - soldShare)),
    },
    realizedPL: roundCents(op.amount - costSold),
  };
}

export function portfolioSummary(positions: Position[]) {
  const open = positions.filter(isOpen);
  const invested = sum(open, (p) => p.invested);
  const current = sum(open, (p) => p.current);
  const profitLoss = current - invested;
  return { invested, current, profitLoss, returnPct: invested > 0 ? (profitLoss / invested) * 100 : null };
}

export function groupByValue(positions: Position[], keyOf: (p: Position) => string) {
  const groups = new Map<string, number>();
  positions.filter(isOpen).forEach((p) => groups.set(keyOf(p), (groups.get(keyOf(p)) ?? 0) + p.current));
  return [...groups].map(([key, value]) => ({ key, label: key, value }));
}

// Valor do portefólio em cada data com valorização, usando o último valor conhecido de cada
// posição. Posições sem qualquer valorização registada ficam de fora: não há história para elas.
export function portfolioHistory(valuations: Valuation[], positionIds: Set<string>) {
  const relevant = valuations.filter((v) => positionIds.has(v.positionId));
  const dates = [...new Set(relevant.map((v) => v.date))].sort();
  const latest = new Map<string, number>();
  return dates.map((date) => {
    relevant.filter((v) => v.date === date).forEach((v) => latest.set(v.positionId, v.value));
    return { date, value: roundCents([...latest.values()].reduce((a, b) => a + b, 0)) };
  });
}
