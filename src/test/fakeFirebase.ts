// Versão em memória das funções do Firebase usadas pela app, para os testes
// exercitarem os repositórios reais sem rede.
type Data = Record<string, unknown>;
type Ref = { path: string; id?: string };
type Constraint = { orderField?: string; whereField?: string; whereValue?: unknown };
type QueryRef = Ref & Constraint;

export const store = new Map<string, Map<string, Data>>();
export const failures = { writes: false, blockedCollections: [] as string[] };

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
const setValue = (ref: Ref, data: Data, options?: { merge?: boolean }) =>
  bucket(ref.path).set(ref.id!, options?.merge ? { ...bucket(ref.path).get(ref.id!), ...data } : data);
const updateValue = (ref: Ref, data: Data) => {
  if (!bucket(ref.path).has(ref.id!)) throw new Error("not-found");
  bucket(ref.path).set(ref.id!, { ...bucket(ref.path).get(ref.id!), ...data });
};

export const getFirestore = () => ({});
export const collection = (_db: unknown, ...segments: string[]): Ref => ({
  path: segments.join("/"),
});
export const doc = (parent: Ref, id?: string): Ref => ({
  path: parent.path,
  id: id ?? `id${nextId++}`,
});
export const orderBy = (field: string): Constraint => ({ orderField: field });
export const where = (field: string, _op: string, value: unknown): Constraint => ({
  whereField: field,
  whereValue: value,
});
export const query = (ref: Ref, ...constraints: Constraint[]): QueryRef =>
  Object.assign({}, ref, ...constraints);

export async function getDocs(ref: QueryRef) {
  if (failures.blockedCollections.some((name) => ref.path.endsWith(`/${name}`))) {
    throw Object.assign(new Error("permission-denied"), { code: "permission-denied" });
  }
  let docs = [...bucket(ref.path).entries()].map(([id, data]) => ({
    id,
    data: () => data,
    ref: { path: ref.path, id },
  }));
  if (ref.whereField) docs = docs.filter((d) => d.data()[ref.whereField!] === ref.whereValue);
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
export async function setDoc(ref: Ref, data: Data) {
  assertWritable();
  setValue(ref, data);
}
export async function updateDoc(ref: Ref, data: Data) {
  assertWritable();
  updateValue(ref, data);
}
export async function deleteDoc(ref: Ref) {
  assertWritable();
  bucket(ref.path).delete(ref.id!);
}
function collector() {
  const writes: (() => void)[] = [];
  return {
    writes,
    set: (ref: Ref, data: Data, options?: { merge?: boolean }) => {
      writes.push(() => setValue(ref, data, options));
    },
    update: (ref: Ref, data: Data) => {
      writes.push(() => updateValue(ref, data));
    },
    delete: (ref: Ref) => {
      writes.push(() => bucket(ref.path).delete(ref.id!));
    },
  };
}
export function writeBatch() {
  const batch = collector();
  return {
    ...batch,
    commit: async () => {
      assertWritable();
      batch.writes.forEach((write) => write());
    },
  };
}
export async function runTransaction(_db: unknown, run: (tx: unknown) => Promise<void>) {
  const batch = collector();
  await run({
    ...batch,
    get: async (ref: Ref) => {
      if (batch.writes.length > 0) throw new Error("Firestore exige leituras antes das escritas.");
      return snapshot(ref);
    },
  });
  assertWritable();
  batch.writes.forEach((write) => write());
}

export const initializeApp = () => ({});

// Autenticação
type FakeUser = { uid: string; email: string };
type Listener = (user: FakeUser | null) => void;
let currentUser: FakeUser | null = null;
const listeners = new Set<Listener>();
const setUser = (user: FakeUser | null) => {
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
  setUser({ uid: email, email });
}
export async function createUserWithEmailAndPassword(_auth: unknown, email: string) {
  setUser({ uid: email, email });
}
export async function signOut() {
  setUser(null);
}

export function seed(path: string, id: string, data: Data) {
  bucket(path).set(id, data);
}

export function resetFakeFirebase() {
  store.clear();
  listeners.clear();
  currentUser = null;
  failures.writes = false;
  failures.blockedCollections = [];
}
