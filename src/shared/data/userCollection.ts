import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { db } from "@/shared/firebase/client";

export type Input<T> = Omit<T, "id">;

export interface CollectionRepository<T extends { id: string }> {
  list(uid: string): Promise<T[]>;
  add(uid: string, data: Input<T>): Promise<void>;
  update(uid: string, id: string, patch: Partial<Input<T>>): Promise<void>;
  remove(uid: string, id: string): Promise<void>;
}

export const userCollectionRef = (uid: string, name: string) =>
  collection(db, "users", uid, name);

export const userDocRef = (uid: string, name: string, id: string) =>
  doc(userCollectionRef(uid, name), id);

// Acesso a uma coleção em users/{uid}/{name}. É aqui, e nos repositórios de cada
// feature, que o Firestore é usado: a UI só conhece a interface CollectionRepository.
// `fromDoc` adapta documentos antigos ao modelo atual na leitura, sem os reescrever.
export function createUserCollection<T extends { id: string }>(
  name: string,
  options: { orderByDate?: boolean; fromDoc?: (id: string, data: DocumentData) => T } = {},
): CollectionRepository<T> {
  const fromDoc = options.fromDoc ?? ((id, data) => ({ id, ...data }) as T);
  return {
    async list(uid) {
      const ref = userCollectionRef(uid, name);
      // Só as coleções com data podem ser ordenadas por data (no Firestore, documentos sem o campo ficam de fora).
      const snapshot = await getDocs(options.orderByDate ? query(ref, orderBy("date", "desc")) : ref);
      return snapshot.docs.map((d) => fromDoc(d.id, d.data()));
    },
    async add(uid, data) {
      await addDoc(userCollectionRef(uid, name), data);
    },
    async update(uid, id, patch) {
      await updateDoc(userDocRef(uid, name, id), patch as UpdateData<DocumentData>);
    },
    async remove(uid, id) {
      await deleteDoc(userDocRef(uid, name, id));
    },
  };
}
