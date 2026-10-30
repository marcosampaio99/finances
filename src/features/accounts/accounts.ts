import { createCollectionHooks } from "@/shared/data/collectionHooks";
import { createUserCollection } from "@/shared/data/userCollection";
import { sum } from "@/shared/lib/math";

export interface Account {
  id: string;
  name: string;
  category: string;
  value: number;
}

export const ACCOUNT_CATEGORIES = [
  { value: "Cash", label: "Cash" },
  { value: "Investimentos", label: "Investimentos" },
  { value: "Cripto", label: "Cripto" },
  { value: "Subsídio", label: "Subsídio (fora do total)" },
  { value: "Outro", label: "Outro" },
];

export const totalAssets = (accounts: Account[]) =>
  sum(
    accounts.filter((a) => a.category !== "Subsídio"),
    (a) => a.value,
  );

export const availableBalance = (accounts: Account[]) =>
  sum(
    accounts.filter((a) => a.category === "Cash"),
    (a) => a.value,
  );

export const accountsRepository = createUserCollection<Account>("accounts");

export const accountHooks = createCollectionHooks("accounts", accountsRepository);
