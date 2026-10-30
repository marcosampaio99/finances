import type { DocumentData } from "firebase/firestore";
import { createCollectionHooks } from "@/shared/data/collectionHooks";
import { createUserCollection } from "@/shared/data/userCollection";

export type AccountType = "checking" | "savings" | "cash" | "brokerage" | "other_asset" | "liability";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Conta à ordem" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "brokerage", label: "Corretora" },
  { value: "other_asset", label: "Outros ativos" },
  { value: "liability", label: "Passivos/dívidas" },
];

export const accountTypeLabel = (type: AccountType) =>
  ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  // Saldo atual. Num passivo é o valor em dívida, sempre positivo.
  value: number;
  excludeFromNetWorth: boolean;
  archived: boolean;
  notes: string;
}

// Contas criadas antes dos tipos só têm `category`, que nunca é reescrita.
const LEGACY_TYPES: Record<string, AccountType> = {
  Cash: "checking",
  Investimentos: "brokerage",
  Cripto: "brokerage",
  Subsídio: "other_asset",
  Outro: "other_asset",
};

export function accountFromDoc(id: string, data: DocumentData): Account {
  const known = ACCOUNT_TYPES.some((t) => t.value === data.type);
  return {
    id,
    name: String(data.name ?? ""),
    type: known ? data.type : (LEGACY_TYPES[data.category] ?? "other_asset"),
    value: Number(data.value) || 0,
    excludeFromNetWorth: data.excludeFromNetWorth ?? data.category === "Subsídio",
    archived: Boolean(data.archived),
    notes: String(data.notes ?? ""),
  };
}

// Entrada de dinheiro aumenta o saldo de um ativo, mas reduz o que se deve num passivo.
export const balanceDelta = (type: AccountType, moneyIn: number) =>
  type === "liability" ? -moneyIn : moneyIn;

export const accountsRepository = createUserCollection<Account>("accounts", {
  fromDoc: accountFromDoc,
});

export const accountHooks = createCollectionHooks("accounts", accountsRepository);
