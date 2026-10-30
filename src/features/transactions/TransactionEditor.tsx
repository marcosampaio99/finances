import { Copy, Pencil, Trash2 } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { accountHooks, type Account } from "@/features/accounts/accounts";
import { useSaveTransaction } from "@/features/transactions/hooks";
import {
  DEFAULT_INCOME_CATEGORY,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  KIND_LABELS,
  TRANSFER_CATEGORY,
  transactionTitle,
  type Transaction,
  type TransactionKind,
} from "@/features/transactions/model";
import { accountLabel, signedAmount } from "@/features/transactions/TransactionRow";
import { today } from "@/shared/lib/date";
import { dateLabel } from "@/shared/lib/format";
import { Drawer } from "@/shared/ui/Drawer";
import { useAction, useFeedback } from "@/shared/ui/feedback";
import { Field, parseNumber, Segmented } from "@/shared/ui/form";

type EditorState =
  | { mode: "new"; kind: TransactionKind }
  | { mode: "edit"; transaction: Transaction }
  | { mode: "duplicate"; transaction: Transaction }
  | { mode: "details"; transaction: Transaction };

interface EditorApi {
  create: (kind?: TransactionKind) => void;
  edit: (transaction: Transaction) => void;
  duplicate: (transaction: Transaction) => void;
  details: (transaction: Transaction) => void;
  remove: (transaction: Transaction) => Promise<void>;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useTransactionEditor() {
  const api = useContext(EditorContext);
  if (!api) throw new Error("useTransactionEditor requer TransactionEditorProvider.");
  return api;
}

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorState | null>(null);
  const [session, setSession] = useState(0);
  const { confirm } = useFeedback();
  const run = useAction();
  const save = useSaveTransaction();
  const { mutateAsync } = save;

  const open = useCallback((next: EditorState) => {
    setSession((s) => s + 1);
    setState(next);
  }, []);
  const close = useCallback(() => setState(null), []);

  const remove = useCallback(
    async (t: Transaction) => {
      const accepted = await confirm({
        title: "Eliminar movimento?",
        message: `"${transactionTitle(t)}" será eliminado e o saldo das contas associadas será reposto. Esta ação não pode ser anulada.`,
      });
      if (!accepted) return;
      await run(
        () => mutateAsync({ previous: t, next: null }),
        "Movimento eliminado",
        "Não foi possível eliminar. Tenta novamente.",
      );
      setState(null);
    },
    [confirm, mutateAsync, run],
  );

  const api = useMemo<EditorApi>(
    () => ({
      create: (kind = "expense") => open({ mode: "new", kind }),
      edit: (transaction) => open({ mode: "edit", transaction }),
      duplicate: (transaction) => open({ mode: "duplicate", transaction }),
      details: (transaction) => open({ mode: "details", transaction }),
      remove,
    }),
    [open, remove],
  );

  return (
    <EditorContext.Provider value={api}>
      {children}
      <Drawer
        open={state !== null}
        onClose={close}
        title={
          state?.mode === "details"
            ? "Detalhes do movimento"
            : state?.mode === "edit"
              ? "Editar movimento"
              : state?.mode === "duplicate"
                ? "Duplicar movimento"
                : "Novo movimento"
        }
      >
        {state?.mode === "details" ? (
          <TransactionDetails transaction={state.transaction} api={api} />
        ) : (
          state && <TransactionForm key={session} state={state} onDone={close} />
        )}
      </Drawer>
    </EditorContext.Provider>
  );
}

function TransactionDetails({ transaction: t, api }: { transaction: Transaction; api: EditorApi }) {
  const accounts = accountHooks.useList().data ?? [];
  const amount = signedAmount(t);
  return (
    <>
      <div className="detail-hero">
        <div className="dim">{transactionTitle(t)}</div>
        <div className={`detail-value ${amount.className}`}>{amount.text}</div>
      </div>
      <dl className="detail-list">
        <dt>Tipo</dt>
        <dd>{KIND_LABELS[t.kind]}</dd>
        <dt>Data</dt>
        <dd>{dateLabel(t.date)}</dd>
        <dt>Categoria</dt>
        <dd>{t.category}</dd>
        <dt>Conta</dt>
        <dd>{accountLabel(t, accounts)}</dd>
        {t.description && (
          <>
            <dt>Descrição</dt>
            <dd>{t.description}</dd>
          </>
        )}
        {t.notes && (
          <>
            <dt>Notas</dt>
            <dd>{t.notes}</dd>
          </>
        )}
      </dl>
      <div className="confirm-actions">
        <button className="btn btn-danger" onClick={() => api.remove(t)}>
          <Trash2 size={15} /> Eliminar
        </button>
        <button className="btn" onClick={() => api.duplicate(t)}>
          <Copy size={15} /> Duplicar
        </button>
        <button className="btn" onClick={() => api.edit(t)}>
          <Pencil size={15} /> Editar
        </button>
      </div>
    </>
  );
}

const usableAccounts = (accounts: Account[], ...keep: (string | null)[]) =>
  accounts.filter((a) => !a.archived || keep.includes(a.id));

function initialValues(state: Exclude<EditorState, { mode: "details" }>, accounts: Account[]) {
  if (state.mode === "new") {
    const firstActive = accounts.find((a) => !a.archived)?.id ?? "";
    return {
      kind: state.kind,
      value: "",
      date: today(),
      expenseCategory: EXPENSE_CATEGORIES[0]!,
      incomeCategory: DEFAULT_INCOME_CATEGORY,
      accountId: firstActive,
      toAccountId: "",
      description: "",
      notes: "",
    };
  }
  const t = state.transaction;
  return {
    kind: t.kind,
    value: String(t.value),
    date: state.mode === "duplicate" ? today() : t.date,
    expenseCategory: t.kind === "expense" ? t.category : EXPENSE_CATEGORIES[0]!,
    incomeCategory: t.kind === "income" ? t.category : DEFAULT_INCOME_CATEGORY,
    accountId: t.accountId ?? "",
    toAccountId: t.toAccountId ?? "",
    description: t.description,
    notes: t.notes,
  };
}

function TransactionForm({
  state,
  onDone,
}: {
  state: Exclude<EditorState, { mode: "details" }>;
  onDone: () => void;
}) {
  const accounts = accountHooks.useList().data ?? [];
  const save = useSaveTransaction();
  const run = useAction();
  const [values, setValues] = useState(() => initialValues(state, accounts));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const options = usableAccounts(accounts, values.accountId, values.toAccountId);
  const isTransfer = values.kind === "transfer";
  const categories = values.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = values.kind === "income" ? values.incomeCategory : values.expenseCategory;
  // Mantém categorias antigas ou fora da lista, para a edição não as alterar sem querer.
  const categoryOptions = categories.includes(category) ? categories : [category, ...categories];

  function validate() {
    const next: Record<string, string> = {};
    const amount = parseNumber(values.value);
    if (amount === null || amount <= 0) next.value = "Indica um montante superior a 0.";
    if (!values.date) next.date = "Indica a data.";
    if (isTransfer) {
      if (!values.accountId) next.accountId = "Escolhe a conta de origem.";
      if (!values.toAccountId) next.toAccountId = "Escolhe a conta de destino.";
      if (values.accountId && values.accountId === values.toAccountId) {
        next.toAccountId = "A conta de destino tem de ser diferente da de origem.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    const previous = state.mode === "edit" ? state.transaction : null;
    const saved = await run(
      () =>
        save.mutateAsync({
          previous,
          next: {
            kind: values.kind,
            date: values.date,
            value: parseNumber(values.value)!,
            description: values.description.trim(),
            notes: values.notes.trim(),
            category: isTransfer ? TRANSFER_CATEGORY : category,
            accountId: values.accountId || null,
            toAccountId: isTransfer ? values.toAccountId || null : null,
          },
        }),
      previous ? "Movimento atualizado" : "Movimento registado",
    );
    if (saved) onDone();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Segmented
        block
        label="Tipo de movimento"
        value={values.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "expense", label: "Despesa" },
          { value: "income", label: "Receita" },
          { value: "transfer", label: "Transferência" },
        ]}
      />
      <Field label="Montante (€)" error={errors.value}>
        <input
          className="input amount-input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoFocus
          value={values.value}
          onChange={(e) => set({ value: e.target.value })}
        />
      </Field>
      <div className="field-row">
        <Field label="Data" error={errors.date}>
          <input className="input" type="date" value={values.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        {isTransfer ? (
          <Field label="Categoria">
            <input className="input" value={TRANSFER_CATEGORY} disabled />
          </Field>
        ) : (
          <Field label="Categoria">
            <select
              className="select"
              value={category}
              onChange={(e) =>
                set(
                  values.kind === "income"
                    ? { incomeCategory: e.target.value }
                    : { expenseCategory: e.target.value },
                )
              }
            >
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {isTransfer ? (
        <div className="field-row">
          <Field label="Conta de origem" error={errors.accountId}>
            <select className="select" value={values.accountId} onChange={(e) => set({ accountId: e.target.value })}>
              <option value="">Escolher…</option>
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conta de destino" error={errors.toAccountId}>
            <select className="select" value={values.toAccountId} onChange={(e) => set({ toAccountId: e.target.value })}>
              <option value="">Escolher…</option>
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Conta" hint="O saldo da conta é atualizado automaticamente.">
          <select className="select" value={values.accountId} onChange={(e) => set({ accountId: e.target.value })}>
            <option value="">Sem conta</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Descrição">
        <input className="input" value={values.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <Field label="Notas (opcional)">
        <textarea className="textarea" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
