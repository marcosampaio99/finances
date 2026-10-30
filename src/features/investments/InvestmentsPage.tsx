import { CircleAlert, LineChart, Pencil, Plus, RefreshCw, ShoppingCart, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { unlinkedPositions } from "@/features/finance/metrics";
import { useFinance } from "@/features/finance/useFinance";
import { operationHooks, useDeletePosition, valuationHooks } from "@/features/investments/hooks";
import {
  assetTypeLabel,
  ASSET_TYPES,
  groupByValue,
  isOpen,
  portfolioHistory,
  portfolioSummary,
  type Position,
} from "@/features/investments/model";
import { OperationForm, PositionForm, ValuationForm } from "@/features/investments/PositionForms";
import { AppPageHeader } from "@/features/shell/PageHeader";
import { dateLabel, dayLabel, eur, pct, quantity, signedEur, signedPct } from "@/shared/lib/format";
import { sum } from "@/shared/lib/math";
import { DonutChart } from "@/shared/ui/charts/DonutChart";
import { TrendChart } from "@/shared/ui/charts/TrendChart";
import { Drawer } from "@/shared/ui/Drawer";
import { useAction, useFeedback } from "@/shared/ui/feedback";
import { EmptyState, ErrorState, PageSkeleton } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/StatCard";

type Panel =
  | { type: "position"; position: Position | null }
  | { type: "valuation"; position: Position }
  | { type: "buy" | "sell"; position: Position };

const PANEL_TITLES = {
  position: "Posição",
  valuation: "Atualizar valorização",
  buy: "Registar compra",
  sell: "Registar venda",
};

function ShareList({ items, total }: { items: { key: string; label: string; value: number }[]; total: number }) {
  return (
    <div>
      {[...items]
        .sort((a, b) => b.value - a.value)
        .map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div className="share-row" key={item.key}>
              <div className="share-head">
                <span>{item.label}</span>
                <span className="num dim">
                  {eur(item.value)} · {pct(Math.round(share))}
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function InvestmentsPage() {
  const { accounts, positions, isLoading, isError, refetch } = useFinance();
  const operations = operationHooks.useList().data ?? [];
  const valuations = valuationHooks.useList().data ?? [];
  const remove = useDeletePosition();
  const run = useAction();
  const { confirm } = useFeedback();
  const [panel, setPanel] = useState<Panel | null>(null);

  const summary = portfolioSummary(positions);
  const open = positions.filter(isOpen);
  const closed = positions.filter((p) => !isOpen(p));
  const realized = sum(operations, (o) => o.realizedPL ?? 0);
  const unlinked = unlinkedPositions(accounts, positions);
  const history = portfolioHistory(valuations, new Set(positions.map((p) => p.id)));
  const positionsWithoutHistory = open.filter((p) => !valuations.some((v) => v.positionId === p.id)).length;

  const byType = ASSET_TYPES.flatMap((t) => {
    const value = sum(
      open.filter((p) => p.assetType === t.value),
      (p) => p.current,
    );
    return value > 0 ? [{ key: t.value, label: t.label, value }] : [];
  });

  async function deletePosition(position: Position) {
    const accepted = await confirm({
      title: "Eliminar posição?",
      message: `"${position.asset}" será eliminada, com todas as suas operações e valorizações. Esta ação não pode ser anulada.`,
    });
    if (!accepted) return;
    await run(() => remove.mutateAsync(position.id), "Posição eliminada", "Não foi possível eliminar. Tenta novamente.");
  }

  const close = () => setPanel(null);

  function positionRow(p: Position) {
    const gain = p.current - p.invested;
    const gainPct = p.invested > 0 ? (gain / p.invested) * 100 : null;
    return (
      <tr key={p.id}>
        <td className="grow">
          <div className="row-title">
            {p.asset} {p.ticker && <span className="faint small">{p.ticker}</span>}
          </div>
          <div className="row-meta">
            {assetTypeLabel(p.assetType)} · {p.broker}
          </div>
        </td>
        <td className="right hide-mobile hide-tablet">
          {p.quantity === null ? <span className="faint">—</span> : quantity(p.quantity)}
          {p.avgPrice !== null && p.quantity !== 0 && (
            <div className="row-meta">
              {p.avgPrice.toLocaleString("pt-PT", { maximumFractionDigits: 4 })} {p.currency}
            </div>
          )}
        </td>
        <td className="right hide-mobile">{eur(p.invested)}</td>
        <td className="right">
          {eur(p.current)}
          {isOpen(p) && (
            <div className={`row-meta ${gain >= 0 ? "pos" : "neg"}`} style={{ color: gain >= 0 ? "var(--pos)" : "var(--neg)" }}>
              {signedEur(gain)}
              {gainPct !== null && ` (${signedPct(Math.round(gainPct * 10) / 10)})`}
            </div>
          )}
        </td>
        <td>
          <div className="row-actions">
            {isOpen(p) && (
              <>
                <button className="icon-btn" title="Atualizar valorização" aria-label={`Atualizar valorização de ${p.asset}`} onClick={() => setPanel({ type: "valuation", position: p })}>
                  <RefreshCw size={14} />
                </button>
                <button className="icon-btn" title="Registar compra" aria-label={`Registar compra de ${p.asset}`} onClick={() => setPanel({ type: "buy", position: p })}>
                  <ShoppingCart size={14} />
                </button>
                <button className="icon-btn" title="Registar venda" aria-label={`Registar venda de ${p.asset}`} onClick={() => setPanel({ type: "sell", position: p })}>
                  <Tag size={14} />
                </button>
              </>
            )}
            <button className="icon-btn" title="Editar" aria-label={`Editar ${p.asset}`} onClick={() => setPanel({ type: "position", position: p })}>
              <Pencil size={14} />
            </button>
            <button className="icon-btn danger" title="Eliminar" aria-label={`Eliminar ${p.asset}`} onClick={() => deletePosition(p)}>
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function positionsTable(rows: Position[]) {
    return (
      <div className="table-wrap">
        <table className="table table-stack table-positions">
          <thead>
            <tr>
              <th>Ativo</th>
              <th className="right hide-tablet">Quantidade</th>
              <th className="right">Investido</th>
              <th className="right">Valor atual</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>{rows.map(positionRow)}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page">
      <AppPageHeader
        title="Investimentos"
        subtitle="Valores em EUR, atualizados manualmente"
        actions={
          <button className="btn" onClick={() => setPanel({ type: "position", position: null })}>
            <Plus size={15} /> <span className="quick-label">Nova posição</span>
          </button>
        }
      />
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <PageSkeleton stats={4} />
      ) : positions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LineChart}
            title="Ainda não tens posições"
            text="Regista os teus investimentos e atualiza a valorização quando quiseres. Não usamos cotações automáticas nem valores simulados."
            action={
              <button className="btn btn-primary" onClick={() => setPanel({ type: "position", position: null })}>
                <Plus size={15} /> Nova posição
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="stats stats-4">
            <StatCard label="Capital investido" value={eur(summary.invested)} hint="Custo das posições abertas" />
            <StatCard label="Valor atual" value={eur(summary.current)} />
            <StatCard
              label="Lucro/prejuízo"
              value={signedEur(summary.profitLoss)}
              tone={summary.profitLoss >= 0 ? "pos" : "neg"}
              hint={operations.some((o) => o.realizedPL !== null) ? `${signedEur(realized)} realizado em vendas` : "Não realizado"}
            />
            <StatCard
              label="Rentabilidade"
              value={summary.returnPct === null ? "—" : signedPct(Math.round(summary.returnPct * 10) / 10)}
              tone={summary.returnPct === null ? undefined : summary.returnPct >= 0 ? "pos" : "neg"}
              hint="Sobre o capital investido"
            />
          </div>

          {unlinked.length > 0 && (
            <div className="notice">
              <CircleAlert size={16} />
              <span>
                {unlinked.length === 1 ? "1 posição sem conta de corretora ativa fica" : `${unlinked.length} posições sem conta de corretora ativa ficam`} fora do
                património líquido para evitar dupla contagem. Edita a posição para a associar; a conta passa a valer a soma das suas posições.
              </span>
            </div>
          )}

          <section className="card card-flush">
            <div className="card-head">
              <h2>Posições abertas</h2>
            </div>
            {open.length > 0 ? positionsTable(open) : <EmptyState compact icon={LineChart} title="Sem posições abertas" />}
          </section>

          {open.length > 0 && (
            <div className="split split-even">
              <section className="card">
                <div className="card-head">
                  <h2>Distribuição por tipo de ativo</h2>
                </div>
                <DonutChart items={byType} totalLabel="Valor atual" ariaLabel="Distribuição do portefólio por tipo de ativo" />
              </section>
              <section className="card">
                <div className="card-head">
                  <h2>Por corretora</h2>
                </div>
                <ShareList items={groupByValue(positions, (p) => p.broker)} total={summary.current} />
                <div className="card-head" style={{ margin: "18px 0 6px" }}>
                  <h2>Por ativo</h2>
                </div>
                <ShareList items={groupByValue(positions, (p) => p.asset)} total={summary.current} />
              </section>
            </div>
          )}

          <section className="card">
            <div className="card-head">
              <h2>Evolução do portefólio</h2>
              {history.length >= 2 && positionsWithoutHistory > 0 && (
                <span className="small faint">
                  {positionsWithoutHistory} {positionsWithoutHistory === 1 ? "posição sem valorizações fica" : "posições sem valorizações ficam"} de fora
                </span>
              )}
            </div>
            {history.length >= 2 ? (
              <TrendChart
                name="Portefólio"
                ariaLabel="Valor do portefólio nas datas com valorização registada"
                data={history.map((h) => ({ label: dayLabel(h.date), value: h.value }))}
              />
            ) : (
              <EmptyState
                compact
                icon={LineChart}
                title="Ainda sem histórico suficiente"
                text="O gráfico aparece quando houver valorizações em pelo menos duas datas. Só usa valores que registaste."
              />
            )}
          </section>

          {operations.length > 0 && (
            <section className="card">
              <div className="card-head" style={{ marginBottom: 4 }}>
                <h2>Operações</h2>
              </div>
              <div className="rows">
                {operations.slice(0, 15).map((op) => {
                  const position = positions.find((p) => p.id === op.positionId);
                  return (
                    <div className="row" key={op.id}>
                      <span className="row-body">
                        <div className="row-title">
                          {op.kind === "buy" ? "Compra" : "Venda"} · {position?.asset ?? "Posição removida"}
                        </div>
                        <div className="row-meta">
                          {dateLabel(op.date)} · {quantity(op.quantity)} unidades
                        </div>
                      </span>
                      <span className="row-end">
                        {eur(op.amount)}
                        {op.realizedPL !== null && <small>{signedEur(op.realizedPL)} realizado</small>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section className="card card-flush">
              <div className="card-head">
                <h2>Posições encerradas</h2>
              </div>
              {positionsTable(closed)}
            </section>
          )}
        </>
      )}

      <Drawer
        open={panel !== null}
        onClose={close}
        title={
          panel
            ? panel.type === "position"
              ? panel.position
                ? "Editar posição"
                : "Nova posição"
              : `${PANEL_TITLES[panel.type]} · ${panel.position.asset}`
            : ""
        }
      >
        {panel?.type === "position" && <PositionForm position={panel.position} accounts={accounts} onDone={close} />}
        {panel?.type === "valuation" && <ValuationForm position={panel.position} valuations={valuations} onDone={close} />}
        {(panel?.type === "buy" || panel?.type === "sell") && (
          <OperationForm
            kind={panel.type}
            position={panel.position}
            onDone={close}
            onEdit={() => setPanel({ type: "position", position: panel.position })}
          />
        )}
      </Drawer>
    </div>
  );
}
