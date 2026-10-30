import { useState, type FormEvent, type ReactNode } from "react";
import type { Account } from "@/features/accounts/accounts";
import { useRecordOperation, useRecordValuation, useSavePosition } from "@/features/investments/hooks";
import { ASSET_TYPES, type AssetType, type Position, type Valuation } from "@/features/investments/model";
import { today } from "@/shared/lib/date";
import { eur, quantity as formatQuantity } from "@/shared/lib/format";
import { roundCents } from "@/shared/lib/math";
import { useAction } from "@/shared/ui/feedback";
import { Field, parseNumber } from "@/shared/ui/form";

function FormActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="confirm-actions">
      <button type="button" className="btn" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "A guardar…" : "Guardar"}
      </button>
    </div>
  );
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export function PositionForm({
  position,
  accounts,
  onDone,
}: {
  position: Position | null;
  accounts: Account[];
  onDone: () => void;
}) {
  const save = useSavePosition();
  const run = useAction();
  const [v, setV] = useState({
    broker: position?.broker ?? "",
    asset: position?.asset ?? "",
    ticker: position?.ticker ?? "",
    assetType: position?.assetType ?? ("etf" as AssetType),
    quantity: position?.quantity?.toString() ?? "",
    avgPrice: position?.avgPrice?.toString() ?? "",
    currency: position?.currency ?? "EUR",
    invested: position ? String(position.invested) : "",
    current: position ? String(position.current) : "",
    date: position?.date ?? today(),
    accountId: position?.accountId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof v>) => setV((current) => ({ ...current, ...patch }));

  const brokerages = accounts.filter((a) => a.type === "brokerage" && (!a.archived || a.id === v.accountId));
  const qty = parseNumber(v.quantity);
  const avg = parseNumber(v.avgPrice);
  const computedCost = v.currency === "EUR" && qty !== null && avg !== null ? roundCents(qty * avg) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invested = parseNumber(v.invested) ?? computedCost;
    const current = parseNumber(v.current);
    const next: Record<string, string> = {};
    if (!v.broker.trim()) next.broker = "Indica a corretora.";
    if (!v.asset.trim()) next.asset = "Indica o nome do ativo.";
    if (qty !== null && qty < 0) next.quantity = "A quantidade não pode ser negativa.";
    if (invested === null || invested < 0) next.invested = "Indica o capital investido em EUR.";
    if (current === null || current < 0) next.current = "Indica o valor atual em EUR.";
    if (!v.date) next.date = "Indica a data.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const saved = await run(
      () =>
        save.mutateAsync({
          previous: position,
          valuationDate: today(),
          data: {
            date: v.date,
            broker: v.broker.trim(),
            asset: v.asset.trim(),
            ticker: v.ticker.trim().toUpperCase(),
            assetType: v.assetType,
            quantity: qty,
            avgPrice: avg,
            currency: v.currency,
            invested: invested!,
            current: current!,
            accountId: v.accountId || null,
          },
        }),
      position ? "Posição atualizada" : "Posição criada",
    );
    if (saved) onDone();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Field label="Nome do ativo" error={errors.asset}>
        <input className="input" autoFocus value={v.asset} onChange={(e) => set({ asset: e.target.value })} placeholder="Ex: Vanguard FTSE All-World" />
      </Field>
      <div className="field-row">
        <Field label="Ticker (opcional)">
          <input className="input" value={v.ticker} onChange={(e) => set({ ticker: e.target.value })} placeholder="VWCE" />
        </Field>
        <Field label="Tipo de ativo">
          <select className="select" value={v.assetType} onChange={(e) => set({ assetType: e.target.value as AssetType })}>
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Corretora" error={errors.broker}>
          <input className="input" value={v.broker} onChange={(e) => set({ broker: e.target.value })} />
        </Field>
        <Field label="Data" error={errors.date}>
          <input className="input" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
      </div>
      <Field label="Conta de corretora" hint="Com conta associada, a posição conta para o património através dessa conta.">
        <select className="select" value={v.accountId} onChange={(e) => set({ accountId: e.target.value })}>
          <option value="">Sem conta associada</option>
          {brokerages.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Quantidade" error={errors.quantity} hint="Necessária para registar compras e vendas.">
          <input className="input" type="number" step="any" min="0" inputMode="decimal" value={v.quantity} onChange={(e) => set({ quantity: e.target.value })} />
        </Field>
        <Field label="Moeda do ativo">
          <select className="select" value={v.currency} onChange={(e) => set({ currency: e.target.value })}>
            {CURRENCIES.includes(v.currency) ? null : <option>{v.currency}</option>}
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={`Preço médio de compra (${v.currency})`}>
        <input className="input" type="number" step="any" min="0" inputMode="decimal" value={v.avgPrice} onChange={(e) => set({ avgPrice: e.target.value })} />
      </Field>
      <div className="field-row">
        <Field
          label="Capital investido (€)"
          error={errors.invested}
          hint={computedCost !== null && !v.invested ? `Se vazio: ${eur(computedCost)}` : undefined}
        >
          <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={v.invested} onChange={(e) => set({ invested: e.target.value })} />
        </Field>
        <Field label="Valor atual (€)" error={errors.current}>
          <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={v.current} onChange={(e) => set({ current: e.target.value })} />
        </Field>
      </div>
      <FormActions pending={save.isPending} onCancel={onDone} />
    </form>
  );
}

export function ValuationForm({
  position,
  valuations,
  onDone,
}: {
  position: Position;
  valuations: Valuation[];
  onDone: () => void;
}) {
  const record = useRecordValuation();
  const run = useAction();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseNumber(value);
    const next: Record<string, string> = {};
    if (amount === null || amount < 0) next.value = "Indica o valor atual em EUR.";
    if (!date) next.date = "Indica a data.";
    else if (date > today()) next.date = "A data não pode ser futura.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const latestKnownDate =
      valuations
        .filter((v) => v.positionId === position.id)
        .map((v) => v.date)
        .sort()
        .at(-1) ?? null;
    const saved = await run(
      () => record.mutateAsync({ position, date, value: amount!, latestKnownDate }),
      "Valorização registada",
    );
    if (saved) onDone();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="dim small">Valor anterior: {eur(position.current)}</p>
      <Field label="Valor da posição (€)" error={errors.value}>
        <input className="input amount-input" type="number" step="0.01" min="0" inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Field label="Data" error={errors.date}>
        <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <FormActions pending={record.isPending} onCancel={onDone} />
    </form>
  );
}

export function OperationForm({
  kind,
  position,
  onDone,
  onEdit,
}: {
  kind: "buy" | "sell";
  position: Position;
  onDone: () => void;
  onEdit: () => void;
}) {
  const record = useRecordOperation();
  const run = useAction();
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEur = position.currency === "EUR";
  const qtyN = parseNumber(qty);
  const priceN = parseNumber(price);
  const computed = isEur && qtyN !== null && priceN !== null ? roundCents(qtyN * priceN) : null;

  if (position.quantity === null) {
    return (
      <EmptyQuantity onEdit={onEdit}>
        Esta posição não tem quantidade definida, por isso não é possível calcular o custo médio de uma
        {kind === "buy" ? " compra" : " venda"} sem distorcer o resultado.
      </EmptyQuantity>
    );
  }
  const held = position.quantity;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const total = parseNumber(amount) ?? computed;
    const next: Record<string, string> = {};
    if (qtyN === null || qtyN <= 0) next.qty = "Indica uma quantidade superior a 0.";
    else if (kind === "sell" && qtyN > held) next.qty = `Só detém ${formatQuantity(held)} unidades.`;
    if (priceN === null || priceN < 0) next.price = "Indica o preço por unidade.";
    if (total === null || total < 0) next.amount = "Indica o total da operação em EUR.";
    if (!date) next.date = "Indica a data.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const saved = await run(
      () =>
        record.mutateAsync({
          positionId: position.id,
          op: { kind, date, quantity: qtyN!, price: priceN!, amount: total! },
        }),
      kind === "buy" ? "Compra registada" : "Venda registada",
    );
    if (saved) onDone();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="dim small">
        Detém {formatQuantity(held)} unidades · valor atual {eur(position.current)}
      </p>
      <div className="field-row">
        <Field label="Quantidade" error={errors.qty}>
          <input className="input" type="number" step="any" min="0" inputMode="decimal" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label={`Preço por unidade (${position.currency})`} error={errors.price}>
          <input className="input" type="number" step="any" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <Field
        label={kind === "buy" ? "Total pago, com comissões (€)" : "Total recebido, após comissões (€)"}
        error={errors.amount}
        hint={computed !== null && !amount ? `Se vazio: ${eur(computed)}` : undefined}
      >
        <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Data" error={errors.date}>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <p className="small faint">
        {kind === "buy"
          ? "O valor atual aumenta pelo total pago até à próxima valorização. O saldo das contas não é alterado."
          : "O custo é reduzido pelo custo médio e o valor atual na mesma proporção. O saldo das contas não é alterado."}
      </p>
      <FormActions pending={record.isPending} onCancel={onDone} />
    </form>
  );
}

function EmptyQuantity({ children, onEdit }: { children: ReactNode; onEdit: () => void }) {
  return (
    <div className="form-stack">
      <p className="dim">{children}</p>
      <button className="btn btn-primary" onClick={onEdit}>
        Definir quantidade
      </button>
    </div>
  );
}
