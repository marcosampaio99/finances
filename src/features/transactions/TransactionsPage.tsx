import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Receipt, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AppPageHeader } from "@/features/shell/PageHeader";
import { useFinance } from "@/features/finance/useFinance";
import { CategoryIcon } from "@/features/transactions/CategoryIcon";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  KIND_LABELS,
  transactionKey,
  transactionTitle,
  type Transaction,
  type TransactionKind,
} from "@/features/transactions/model";
import { useTransactionEditor } from "@/features/transactions/TransactionEditor";
import { accountLabel, signedAmount } from "@/features/transactions/TransactionRow";
import { dateLabel } from "@/shared/lib/format";
import { Segmented, parseNumber } from "@/shared/ui/form";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";

const TABS: { value: string; label: string; kind?: TransactionKind }[] = [
  { value: "todas", label: "Todas" },
  { value: "despesas", label: "Despesas", kind: "expense" },
  { value: "receitas", label: "Receitas", kind: "income" },
  { value: "transferencias", label: "Transferências", kind: "transfer" },
];

const PAGE_SIZE = 50;
const EMPTY_FILTERS = { search: "", category: "", account: "", from: "", to: "", min: "", max: "" };

type SortKey = "date" | "description" | "value";

function matches(t: Transaction, f: typeof EMPTY_FILTERS) {
  const term = f.search.trim().toLowerCase();
  if (term && !`${t.description} ${t.notes} ${t.category}`.toLowerCase().includes(term)) return false;
  if (f.category && t.category !== f.category) return false;
  if (f.account && t.accountId !== f.account && t.toAccountId !== f.account) return false;
  if (f.from && t.date < f.from) return false;
  if (f.to && t.date > f.to) return false;
  const min = parseNumber(f.min);
  const max = parseNumber(f.max);
  if (min !== null && t.value < min) return false;
  if (max !== null && t.value > max) return false;
  return true;
}

function compare(a: Transaction, b: Transaction, key: SortKey) {
  if (key === "value") return a.value - b.value;
  if (key === "description") return transactionTitle(a).localeCompare(transactionTitle(b), "pt");
  return a.date.localeCompare(b.date);
}

export function TransactionsPage() {
  const { accounts, transactions, isLoading, isError, refetch } = useFinance();
  const editor = useTransactionEditor();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "date", desc: true });
  const [limit, setLimit] = useState(PAGE_SIZE);

  const tab = TABS.find((t) => t.value === params.get("tipo")) ?? TABS[0]!;
  const set = (patch: Partial<typeof EMPTY_FILTERS>) => {
    setLimit(PAGE_SIZE);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const categories = useMemo(() => {
    const known = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    const extra = transactions.map((t) => t.category).filter((c) => c !== "Transferência" && !known.includes(c));
    return [...known, ...new Set(extra)];
  }, [transactions]);

  const visible = useMemo(() => {
    const scoped = transactions.filter((t) => (!tab.kind || t.kind === tab.kind) && matches(t, filters));
    const direction = sort.desc ? -1 : 1;
    return scoped.sort((a, b) => direction * compare(a, b, sort.key));
  }, [transactions, tab.kind, filters, sort]);

  const hasFilters = Object.values(filters).some(Boolean);

  function sortHeader(key: SortKey, label: string, right = false) {
    const active = sort.key === key;
    return (
      <th className={right ? "right" : undefined} aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}>
        <button
          className="sort-btn"
          onClick={() => setSort({ key, desc: active ? !sort.desc : key !== "description" })}
        >
          {label}
          {active && (sort.desc ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}
        </button>
      </th>
    );
  }

  return (
    <div className="page">
      <AppPageHeader title="Transações" subtitle={isLoading ? undefined : `${transactions.length} movimentos`} />
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <PageSkeleton stats={0} />
      ) : (
        <>
          <Segmented
            label="Tipo de movimento"
            options={TABS.map((t) => ({ value: t.value, label: t.label }))}
            value={tab.value}
            onChange={(value) => {
              setLimit(PAGE_SIZE);
              setParams(value === "todas" ? {} : { tipo: value }, { replace: true });
            }}
          />
          <div className="filters">
            <div className="search">
              <Search size={15} />
              <input
                className="input input-sm"
                type="search"
                placeholder="Pesquisar descrição…"
                aria-label="Pesquisar"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
              />
            </div>
            <select className="select input-sm" aria-label="Categoria" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="select input-sm" aria-label="Conta" value={filters.account} onChange={(e) => set({ account: e.target.value })}>
              <option value="">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input className="input input-sm" type="date" aria-label="Desde" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
            <input className="input input-sm" type="date" aria-label="Até" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
            <input className="input input-sm" type="number" min="0" placeholder="Mín. €" aria-label="Valor mínimo" value={filters.min} onChange={(e) => set({ min: e.target.value })} />
            <input className="input input-sm" type="number" min="0" placeholder="Máx. €" aria-label="Valor máximo" value={filters.max} onChange={(e) => set({ max: e.target.value })} />
            {hasFilters && (
              <button className="btn btn-ghost input-sm" onClick={() => set(EMPTY_FILTERS)}>
                <X size={14} /> Limpar
              </button>
            )}
          </div>
          <div className="card card-flush">
            {visible.length === 0 ? (
              transactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Ainda não há movimentos"
                  text="Regista a primeira despesa ou receita para começares a acompanhar as tuas finanças."
                  action={
                    <button className="btn btn-primary" onClick={() => editor.create()}>
                      <Plus size={15} /> Novo movimento
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="Nenhum movimento encontrado"
                  text="Experimenta alterar os filtros ou o tipo de movimento."
                  action={
                    hasFilters ? (
                      <button className="btn" onClick={() => set(EMPTY_FILTERS)}>
                        Limpar filtros
                      </button>
                    ) : undefined
                  }
                />
              )
            ) : (
              <div className="table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      {sortHeader("date", "Data")}
                      {sortHeader("description", "Descrição")}
                      <th className="hide-tablet">Categoria</th>
                      <th className="hide-tablet">Conta</th>
                      <th className="hide-tablet">Tipo</th>
                      {sortHeader("value", "Valor", true)}
                      <th>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(0, limit).map((t) => {
                      const amount = signedAmount(t);
                      return (
                        <tr key={transactionKey(t)}>
                          <td className="nowrap dim hide-mobile">{dateLabel(t.date)}</td>
                          <td className="grow">
                            <button className="cell-title" onClick={() => editor.details(t)}>
                              <span className="row-icon">
                                <CategoryIcon category={t.category} size={15} />
                              </span>
                              <span className="row-stack">
                                <span className="cell-text">{transactionTitle(t)}</span>
                                <span className="mobile-meta">
                                  <span className="meta-date">{dateLabel(t.date)} · </span>
                                  {accountLabel(t, accounts)}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="dim hide-mobile hide-tablet">{t.category}</td>
                          <td className="dim hide-mobile hide-tablet">{accountLabel(t, accounts)}</td>
                          <td className="hide-mobile hide-tablet">
                            <span className="badge">{KIND_LABELS[t.kind]}</span>
                          </td>
                          <td className={`right ${amount.className}`}>{amount.text}</td>
                          <td className="hide-mobile">
                            <div className="row-actions">
                              <button className="icon-btn" aria-label={`Editar ${transactionTitle(t)}`} title="Editar" onClick={() => editor.edit(t)}>
                                <Pencil size={14} />
                              </button>
                              <button className="icon-btn" aria-label={`Duplicar ${transactionTitle(t)}`} title="Duplicar" onClick={() => editor.duplicate(t)}>
                                <Copy size={14} />
                              </button>
                              <button className="icon-btn danger" aria-label={`Eliminar ${transactionTitle(t)}`} title="Eliminar" onClick={() => editor.remove(t)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {visible.length > limit && (
            <button className="btn" style={{ alignSelf: "center" }} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Mostrar mais ({visible.length - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}
