import { doc, runTransaction } from "firebase/firestore";
import { accountFromDoc, balanceDelta } from "@/features/accounts/accounts";
import {
  COLLECTION_BY_KIND,
  netFlows,
  transactionFromDoc,
  transactionToDoc,
  type Transaction,
  type TransactionInput,
  type TransactionKind,
} from "@/features/transactions/model";
import { createUserCollection, userCollectionRef, userDocRef } from "@/shared/data/userCollection";
import { db } from "@/shared/firebase/client";
import { roundCents } from "@/shared/lib/math";

const repositoryFor = (kind: TransactionKind) =>
  createUserCollection<Transaction>(COLLECTION_BY_KIND[kind], {
    orderByDate: true,
    fromDoc: (id, data) => transactionFromDoc(kind, id, data),
  });

export const transactionLists = {
  expense: repositoryFor("expense"),
  income: repositoryFor("income"),
  transfer: repositoryFor("transfer"),
};

// Cria (previous = null), edita, ou apaga (next = null) um movimento. O movimento e os
// saldos mudam na mesma transação, a partir dos valores atuais lidos do servidor.
export async function saveTransaction(
  uid: string,
  previous: Pick<Transaction, "kind" | "id"> | null,
  next: TransactionInput | null,
) {
  const previousRef = previous
    ? userDocRef(uid, COLLECTION_BY_KIND[previous.kind], previous.id)
    : null;
  const nextRef = next
    ? previous && previousRef && previous.kind === next.kind
      ? previousRef
      : doc(userCollectionRef(uid, COLLECTION_BY_KIND[next.kind]))
    : null;

  await runTransaction(db, async (tx) => {
    const previousSnap = previousRef ? await tx.get(previousRef) : null;
    const stored =
      previous && previousSnap?.exists()
        ? transactionFromDoc(previous.kind, previous.id, previousSnap.data())
        : null;

    const updates = [];
    for (const [accountId, moneyIn] of netFlows(stored, next)) {
      if (Math.abs(moneyIn) < 0.005) continue;
      const ref = userDocRef(uid, "accounts", accountId);
      const snap = await tx.get(ref);
      // Uma conta apagada deixa de ter saldo a acertar; o movimento mantém-se.
      if (!snap.exists()) continue;
      const account = accountFromDoc(accountId, snap.data());
      updates.push({ ref, value: roundCents(account.value + balanceDelta(account.type, moneyIn)) });
    }

    if (previousRef && previousRef !== nextRef) tx.delete(previousRef);
    if (nextRef && next) tx.set(nextRef, transactionToDoc(next), { merge: true });
    updates.forEach(({ ref, value }) => tx.update(ref, { value }));
  });
}
