import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/shared/firebase/client";

export type Input<T> = Omit<T, "id">;

export interface CollectionRepository<T extends { id: string }> {
  list(uid: string): Promise<T[]>;
  add(uid: string, data: Input<T>): Promise<void>;
  remove(uid: string, id: string): Promise<void>;
}

export const userCollectionRef = (uid: string, name: string) =>
  collection(db, "users", uid, name);

// Acesso a uma coleção em users/{uid}/{name}. É aqui, e nos repositórios de cada
// feature, que o Firestore é usado: a UI só conhece a interface CollectionRepository.
export function createUserCollection<T extends { id: string }>(
  name: string,
  options: { orderByDate?: boolean } = {},
): CollectionRepository<T> {
  return {
    async list(uid) {
      const ref = userCollectionRef(uid, name);
      // Só as coleções com data podem ser ordenadas por data (no Firestore, documentos sem o campo ficam de fora).
      const snapshot = await getDocs(options.orderByDate ? query(ref, orderBy("date", "desc")) : ref);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    },
    async add(uid, data) {
      await addDoc(userCollectionRef(uid, name), data);
    },
    async remove(uid, id) {
      await deleteDoc(doc(userCollectionRef(uid, name), id));
    },
  };
}
