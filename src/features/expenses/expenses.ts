import { doc, runTransaction, type DocumentReference, type Transaction } from "firebase/firestore";
import { createCollectionHooks } from "@/shared/data/collectionHooks";
import {
  createUserCollection,
  userCollectionRef,
  type CollectionRepository,
  type Input,
} from "@/shared/data/userCollection";
import { db } from "@/shared/firebase/client";
import { currentMonth } from "@/shared/lib/date";
import { roundCents, sum } from "@/shared/lib/math";

export interface Expense {
  id: string;
  date: string;
  category: string;
  accountId: string | null;
  description: string;
  value: number;
}

export const EXPENSE_CATEGORIES = [
  "Restaurantes/Café",
  "Roupa/Acessórios",
  "Prendas",
  "Saúde",
  "Subscrições",
  "Transportes",
  "Lazer",
  "Casa",
  "Outros",
];

export const monthExpenses = (expenses: Expense[], month = currentMonth()) =>
  sum(
    expenses.filter((e) => e.date.startsWith(month)),
    (e) => e.value,
  );

const accountRef = (uid: string, accountId: string) =>
  doc(userCollectionRef(uid, "accounts"), accountId);

// Soma (ou subtrai, se delta for negativo) ao saldo de uma conta, se ainda existir.
// Devolve a escrita para ser feita depois de todas as leituras da transação.
async function prepareAccountAdjustment(tx: Transaction, ref: DocumentReference, delta: number) {
  const account = await tx.get(ref);
  return () => {
    if (account.exists()) {
      tx.update(ref, { value: roundCents(Number(account.data().value) + delta) });
    }
  };
}

const baseRepository = createUserCollection<Expense>("expenses", { orderByDate: true });

// A despesa e o saldo da conta mudam na mesma transação: ou ficam ambos gravados, ou nenhum.
export const expensesRepository: CollectionRepository<Expense> = {
  list: baseRepository.list,

  // Despesa: desconta da conta escolhida.
  async add(uid, data: Input<Expense>) {
    const expenseRef = doc(userCollectionRef(uid, "expenses"));
    await runTransaction(db, async (tx) => {
      const adjust = data.accountId
        ? await prepareAccountAdjustment(tx, accountRef(uid, data.accountId), -data.value)
        : null;
      tx.set(expenseRef, data);
      adjust?.();
    });
  },

  // Ao apagar, devolve o valor à conta.
  async remove(uid, id) {
    const expenseRef = doc(userCollectionRef(uid, "expenses"), id);
    await runTransaction(db, async (tx) => {
      const expense = await tx.get(expenseRef);
      const data = expense.data();
      const adjust = data?.accountId
        ? await prepareAccountAdjustment(tx, accountRef(uid, data.accountId), Number(data.value))
        : null;
      tx.delete(expenseRef);
      adjust?.();
    });
  },
};

export const expenseHooks = createCollectionHooks("expenses", expensesRepository, {
  alsoInvalidates: ["accounts"],
});
