// Versão em memória das funções do Firebase usadas pela app, para os testes
// exercitarem os repositórios reais sem rede.
type Data = Record<string, unknown>;
type Ref = { path: string; id?: string; orderField?: string };

export const store = new Map<string, Map<string, Data>>();
export const failures = { writes: false };

let nextId = 1;
const bucket = (path: string) => {
  if (!store.has(path)) store.set(path, new Map());
  return store.get(path)!;
};
const snapshot = (ref: Ref) => {
  const data = bucket(ref.path).get(ref.id!);
  return { id: ref.id, exists: () => data !== undefined, data: () => data };
};
const assertWritable = () => {
  if (failures.writes) throw new Error("permission-denied");
};

export const getFirestore = () => ({});
export const collection = (_db: unknown, ...segments: string[]): Ref => ({
  path: segments.join("/"),
});
export const doc = (parent: Ref, id?: string): Ref => ({
  path: parent.path,
  id: id ?? `id${nextId++}`,
});
export const orderBy = (field: string) => field;
export const query = (ref: Ref, field: string): Ref => ({ ...ref, orderField: field });

export async function getDocs(ref: Ref) {
  let docs = [...bucket(ref.path).entries()].map(([id, data]) => ({ id, data: () => data }));
  if (ref.orderField) {
    const field = ref.orderField;
    docs = docs
      .filter((d) => d.data()[field] !== undefined)
      .sort((a, b) => String(b.data()[field]).localeCompare(String(a.data()[field])));
  }
  return { docs };
}
export async function addDoc(ref: Ref, data: Data) {
  assertWritable();
  bucket(ref.path).set(`id${nextId++}`, data);
}
export async function deleteDoc(ref: Ref) {
  assertWritable();
  bucket(ref.path).delete(ref.id!);
}
export async function runTransaction(_db: unknown, run: (tx: unknown) => Promise<void>) {
  const writes: (() => void)[] = [];
  let wrote = false;
  await run({
    get: async (ref: Ref) => {
      if (wrote) throw new Error("Firestore exige leituras antes das escritas.");
      return snapshot(ref);
    },
    set: (ref: Ref, data: Data) => {
      wrote = true;
      writes.push(() => bucket(ref.path).set(ref.id!, data));
    },
    update: (ref: Ref, data: Data) => {
      wrote = true;
      writes.push(() => bucket(ref.path).set(ref.id!, { ...bucket(ref.path).get(ref.id!), ...data }));
    },
    delete: (ref: Ref) => {
      wrote = true;
      writes.push(() => bucket(ref.path).delete(ref.id!));
    },
  });
  assertWritable();
  writes.forEach((write) => write());
}

export const initializeApp = () => ({});

// Autenticação
type Listener = (user: { uid: string } | null) => void;
let currentUser: { uid: string } | null = null;
const listeners = new Set<Listener>();
const setUser = (user: { uid: string } | null) => {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
};

export const getAuth = () => ({});
export function onAuthStateChanged(_auth: unknown, listener: Listener) {
  listeners.add(listener);
  queueMicrotask(() => listener(currentUser));
  return () => listeners.delete(listener);
}
export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  if (password === "errada") throw Object.assign(new Error(), { code: "auth/invalid-credential" });
  setUser({ uid: email });
}
export async function createUserWithEmailAndPassword(_auth: unknown, email: string) {
  setUser({ uid: email });
}
export async function signOut() {
  setUser(null);
}

export function resetFakeFirebase() {
  store.clear();
  listeners.clear();
  currentUser = null;
  failures.writes = false;
}
