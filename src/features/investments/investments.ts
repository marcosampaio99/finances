import { createCollectionHooks } from "@/shared/data/collectionHooks";
import { createUserCollection } from "@/shared/data/userCollection";
import { sum } from "@/shared/lib/math";

export interface Investment {
  id: string;
  date: string;
  broker: string;
  asset: string;
  invested: number;
  current: number;
}

export function portfolioSummary(investments: Investment[]) {
  const invested = sum(investments, (i) => i.invested);
  const current = sum(investments, (i) => i.current);
  return { invested, current, profitLoss: current - invested };
}

export const investmentsRepository = createUserCollection<Investment>("investments", {
  orderByDate: true,
});

export const investmentHooks = createCollectionHooks("investments", investmentsRepository);
