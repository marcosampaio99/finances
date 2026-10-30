import { createCollectionHooks } from "@/shared/data/collectionHooks";
import { createUserCollection } from "@/shared/data/userCollection";

export interface Income {
  id: string;
  date: string;
  description: string;
  value: number;
}

export const incomeRepository = createUserCollection<Income>("income", { orderByDate: true });

export const incomeHooks = createCollectionHooks("income", incomeRepository);
