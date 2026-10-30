import {
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import {
  applyOperation,
  positionFromDoc,
  type Operation,
  type OperationInput,
  type Position,
  type PositionInput,
  type Valuation,
} from "@/features/investments/model";
import { createUserCollection, userCollectionRef, userDocRef } from "@/shared/data/userCollection";
import { db } from "@/shared/firebase/client";

export const positionsRepository = createUserCollection<Position>("investments", {
  orderByDate: true,
  fromDoc: positionFromDoc,
});
export const operationsRepository = createUserCollection<Operation>("investmentOperations", {
  orderByDate: true,
});
export const valuationsRepository = createUserCollection<Valuation>("investmentValuations", {
  orderByDate: true,
});

// Uma valorização por posição e dia: registar outra no mesmo dia substitui a anterior.
const valuationRef = (uid: string, positionId: string, date: string) =>
  userDocRef(uid, "investmentValuations", `${positionId}_${date}`);

export async function savePosition(
  uid: string,
  previous: Position | null,
  data: PositionInput,
  valuationDate: string,
) {
  const ref = previous
    ? userDocRef(uid, "investments", previous.id)
    : doc(userCollectionRef(uid, "investments"));
  const batch = writeBatch(db);
  batch.set(ref, data as DocumentData, { merge: true });
  if (!previous || previous.current !== data.current) {
    batch.set(valuationRef(uid, ref.id, valuationDate), {
      positionId: ref.id,
      date: valuationDate,
      value: data.current,
    });
  }
  await batch.commit();
}

export async function recordValuation(
  uid: string,
  position: Position,
  date: string,
  value: number,
  latestKnownDate: string | null,
) {
  const batch = writeBatch(db);
  batch.set(valuationRef(uid, position.id, date), { positionId: position.id, date, value });
  // Registar uma valorização antiga completa a história, mas não muda o valor atual.
  if (!latestKnownDate || date >= latestKnownDate) {
    batch.update(userDocRef(uid, "investments", position.id), { current: value });
  }
  await batch.commit();
}

export async function recordOperation(uid: string, positionId: string, op: OperationInput) {
  const positionRef = userDocRef(uid, "investments", positionId);
  const operationRef = doc(userCollectionRef(uid, "investmentOperations"));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(positionRef);
    if (!snap.exists()) throw new Error("A posição já não existe.");
    const { patch, realizedPL } = applyOperation(positionFromDoc(positionId, snap.data()), op);
    tx.set(operationRef, { positionId, ...op, realizedPL });
    tx.set(valuationRef(uid, positionId, op.date), {
      positionId,
      date: op.date,
      value: patch.current,
    });
    tx.update(positionRef, patch);
  });
}

export async function deletePosition(uid: string, positionId: string) {
  const related = await Promise.all(
    ["investmentOperations", "investmentValuations"].map((name) =>
      getDocs(query(userCollectionRef(uid, name), where("positionId", "==", positionId))),
    ),
  );
  const batch = writeBatch(db);
  related.forEach((snapshot) => snapshot.docs.forEach((d) => batch.delete(d.ref)));
  batch.delete(userDocRef(uid, "investments", positionId));
  await batch.commit();
}
