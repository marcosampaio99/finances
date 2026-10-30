import { Archive, ArchiveRestore, CircleAlert, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AppPageHeader } from "@/features/shell/PageHeader";
import {
  accountHooks,
  accountTypeLabel,
  ACCOUNT_TYPES,
  type Account,
  type AccountType,
} from "@/features/accounts/accounts";
import {
  accountWorth,
  isValuedByPositions,
  netWorthSummary,
  unlinkedPositions,
} from "@/features/finance/metrics";
import { useFinance } from "@/features/finance/useFinance";
import { transactionKey } from "@/features/transactions/model";
import { useTransactionEditor } from "@/features/transactions/TransactionEditor";
import { TransactionRow } from "@/features/transactions/TransactionRow";
import { eur, pct } from "@/shared/lib/format";
import { Drawer } from "@/shared/ui/Drawer";
import { useAction, useFeedback } from "@/shared/ui/feedback";
import { Field, parseNumber } from "@/shared/ui/form";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/StatCard";

const GROUPS: { label: string; types: AccountType[] }[] = [
  { label: "Contas financeiras", types: ["checking", "savings", "cash"] },
  { label: "Investimentos e outros ativos", types: ["brokerage", "other_asset"] },
  { label: "Passivos", types: ["liability"] },
];

export function AccountsPage() {
  const { accounts, positions, transactions, isLoading, isError, refetch } = useFinance();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const editor = useTransactionEditor();
  const update = accountHooks.useUpdate();
  const remove = accountHooks.useRemove();
  const run = useAction();
  const { confirm } = useFeedback();

  const summary = netWorthSummary(accounts, positions);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const unlinked = unlinkedPositions(accounts, positions);
  const viewing = accounts.find((a) => a.id === viewingId) ?? null;

  const movementsOf = (account: Account) =>
    transactions.filter((t) => t.accountId === account.id || t.toAccountId === account.id);

  async function toggleArchive(account: Account) {
    if (!account.archived) {
      const accepted = await confirm({
        title: "Arquivar conta?",
        message: `"${account.name}" deixa de contar para o património e de aparecer nos formulários. Os movimentos mantêm-se e podes restaurá-la a qualquer momento.`,
        confirmLabel: "Arquivar",
      });
      if (!accepted) return;
    }
    await run(
      () => update.mutateAsync({ id: account.id, patch: { archived: !account.archived } }),
      account.archived ? "Conta restaurada" : "Conta arquivada",
    );
    setViewingId(null);
  }

  async function deleteAccount(account: Account) {
    const accepted = await confirm({
      title: "Eliminar conta?",
      message: `"${account.name}" será eliminada definitivamente. Esta ação não pode ser anulada.`,
    });
    if (!accepted) return;
    await run(() => remove.mutateAsync(account.id), "Conta eliminada", "Não foi possível eliminar. Tenta novamente.");
    setViewingId(null);
  }

  function accountRow(account: Account) {
    const worth = accountWorth(account, positions);
    const isDebt = account.type === "liability";
    const counts = !account.excludeFromNetWorth && !account.archived;
    return (
      <button key={account.id} type="button" className="row" onClick={() => setViewingId(account.id)}>
        <span className="row-body">
          <div className="row-title">{account.name}</div>
          <div className="row-meta">
            {accountTypeLabel(account.type)}
            {isValuedByPositions(account, positions) && " · valor das posições"}
          </div>
        </span>
        {account.excludeFromNetWorth && <span className="badge">Fora do património</span>}
        <span className="row-end">
          <span className={isDebt ? "neg" : undefined}>{isDebt ? `-${eur(worth)}` : eur(worth)}</span>
          {counts && !isDebt && summary.assets > 0 && <small>{pct(Math.round((worth / summary.assets) * 100))} dos ativos</small>}
        </span>
      </button>
    );
  }

  return (
    <div className="page">
      <AppPageHeader
        title="Contas"
        subtitle="Saldos, ativos e passivos"
        actions={
          <button className="btn" onClick={() => setEditing("new")}>
            <Plus size={15} /> <span className="quick-label">Nova conta</span>
          </button>
        }
      />
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <PageSkeleton />
      ) : accounts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Landmark}
            title="Adiciona a tua primeira conta"
            text="As contas são a base do teu património e do saldo disponível."
            action={
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                <Plus size={15} /> Nova conta
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="stats">
            <StatCard label="Património líquido" value={eur(summary.netWorth)} hint="Ativos menos passivos" />
            <StatCard label="Ativos" value={eur(summary.assets)} />
            <StatCard label="Passivos" value={eur(summary.liabilities)} />
          </div>
          {unlinked.length > 0 && (
            <div className="notice">
              <CircleAlert size={16} />
              <span>
                {unlinked.length === 1 ? "1 posição não está associada" : `${unlinked.length} posições não estão associadas`} a
                uma conta de corretora e fica{unlinked.length === 1 ? "" : "m"} fora do património para evitar dupla
                contagem. <Link to="/investimentos">Associar em Investimentos</Link>.
              </span>
            </div>
          )}
          {GROUPS.map((group) => {
            const members = active.filter((a) => group.types.includes(a.type));
            if (members.length === 0) return null;
            return (
              <section className="card" key={group.label}>
                <div className="card-head" style={{ marginBottom: 4 }}>
                  <h2>{group.label}</h2>
                </div>
                <div className="rows">{members.map(accountRow)}</div>
              </section>
            );
          })}
          {archived.length > 0 && (
            <section className="card">
              <div className="card-head" style={{ marginBottom: showArchived ? 4 : 0 }}>
                <h2>Arquivadas ({archived.length})</h2>
                <button className="link" onClick={() => setShowArchived((s) => !s)}>
                  {showArchived ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {showArchived && <div className="rows">{archived.map(accountRow)}</div>}
            </section>
          )}
        </>
      )}

      <Drawer open={viewing !== null} onClose={() => setViewingId(null)} title={viewing?.name ?? ""}>
        {viewing && (
          <>
            <div className="detail-hero">
              <div className="dim">{accountTypeLabel(viewing.type)}</div>
              <div className="detail-value">
                {viewing.type === "liability" ? "-" : ""}
                {eur(accountWorth(viewing, positions))}
              </div>
              {isValuedByPositions(viewing, positions) && (
                <div className="small faint">Calculado a partir das posições associadas.</div>
              )}
              {viewing.notes && <p className="small dim" style={{ marginTop: 8 }}>{viewing.notes}</p>}
            </div>
            <div className="confirm-actions" style={{ margin: "12px 0 18px", justifyContent: "flex-start", flexWrap: "wrap" }}>
              <button className="btn" onClick={() => { setEditing(viewing); setViewingId(null); }}>
                <Pencil size={15} /> Editar
              </button>
              <button className="btn" onClick={() => toggleArchive(viewing)}>
                {viewing.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                {viewing.archived ? "Restaurar" : "Arquivar"}
              </button>
              {movementsOf(viewing).length === 0 && !positions.some((p) => p.accountId === viewing.id) && (
                <button className="btn btn-danger" onClick={() => deleteAccount(viewing)}>
                  <Trash2 size={15} /> Eliminar
                </button>
              )}
            </div>
            <h3 style={{ marginBottom: 4 }}>Movimentos</h3>
            {movementsOf(viewing).length === 0 ? (
              <p className="small faint" style={{ padding: "8px 0" }}>
                Sem movimentos associados a esta conta.
              </p>
            ) : (
              <div className="rows">
                {movementsOf(viewing).slice(0, 50).map((t) => (
                  <TransactionRow
                    key={transactionKey(t)}
                    transaction={t}
                    accounts={accounts}
                    onOpen={() => {
                      setViewingId(null);
                      editor.details(t);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Drawer>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nova conta" : "Editar conta"}
      >
        {editing && (
          <AccountForm
            account={editing === "new" ? null : editing}
            valuedByPositions={editing !== "new" && isValuedByPositions(editing, positions)}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function AccountForm({
  account,
  valuedByPositions,
  onDone,
}: {
  account: Account | null;
  valuedByPositions: boolean;
  onDone: () => void;
}) {
  const add = accountHooks.useAdd();
  const update = accountHooks.useUpdate();
  const run = useAction();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [value, setValue] = useState(account ? String(account.value) : "");
  const [exclude, setExclude] = useState(account?.excludeFromNetWorth ?? false);
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseNumber(value);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Indica o nome da conta.";
    if (amount === null) next.value = "Indica o saldo atual.";
    else if (type === "liability" && amount < 0) next.value = "Indica o valor em dívida como número positivo.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data = {
      name: name.trim(),
      type,
      value: amount!,
      excludeFromNetWorth: exclude,
      notes: notes.trim(),
    };
    const saved = await run(
      () =>
        account
          ? update.mutateAsync({ id: account.id, patch: data })
          : add.mutateAsync({ ...data, archived: false }),
      account ? "Conta atualizada" : "Conta criada",
    );
    if (saved) onDone();
  }

  const pending = add.isPending || update.isPending;

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Field label="Nome" error={errors.name}>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Santander" />
      </Field>
      <Field label="Tipo">
        <select className="select" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={type === "liability" ? "Valor em dívida (€)" : "Saldo atual (€)"}
        error={errors.value}
        hint={
          valuedByPositions
            ? "Esta corretora é valorizada pelas posições; este saldo só volta a contar se deixar de ter posições."
            : "Alterar o saldo aqui não cria um movimento."
        }
      >
        <input className="input" type="number" step="0.01" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
        <span>Excluir do património líquido e do saldo disponível (ex.: subsídio de refeição)</span>
      </label>
      <Field label="Notas (opcional)">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
