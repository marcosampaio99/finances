import { accountFromDoc, type Account } from "@/features/accounts/accounts";
import { budgetRows, budgetStatus } from "@/features/budgets/budgets";
import { availableBalance, netWorthSummary, unlinkedPositions } from "@/features/finance/metrics";
import {
  applyOperation,
  portfolioHistory,
  positionFromDoc,
  type Position,
} from "@/features/investments/model";
import { transactionsCsv } from "@/features/reports/exportCsv";
import { buildInsights, cashflowSeries, monthSummary } from "@/features/transactions/analytics";
import { netFlows, transactionFromDoc, type Transaction } from "@/features/transactions/model";

const account = (patch: Partial<Account>): Account => ({
  id: "a",
  name: "Conta",
  type: "checking",
  value: 0,
  excludeFromNetWorth: false,
  archived: false,
  notes: "",
  ...patch,
});
const position = (patch: Partial<Position>): Position => ({
  id: "p",
  date: "2026-01-01",
  broker: "XTB",
  asset: "VWCE",
  ticker: "",
  assetType: "etf",
  quantity: 10,
  avgPrice: 100,
  currency: "EUR",
  invested: 1000,
  current: 1200,
  accountId: null,
  ...patch,
});
const tx = (patch: Partial<Transaction>): Transaction => ({
  id: "t",
  kind: "expense",
  date: "2026-10-05",
  description: "",
  notes: "",
  value: 10,
  category: "Outros",
  accountId: null,
  toAccountId: null,
  ...patch,
});

describe("compatibilidade com documentos antigos", () => {
  it("deduz o tipo da conta a partir de category", () => {
    expect(accountFromDoc("1", { name: "S", category: "Cash", value: 5 }).type).toBe("checking");
    expect(accountFromDoc("1", { name: "X", category: "Investimentos", value: 5 }).type).toBe("brokerage");
    const subsidy = accountFromDoc("1", { name: "Sub", category: "Subsídio", value: 5 });
    expect(subsidy.excludeFromNetWorth).toBe(true);
  });

  it("aceita receitas sem categoria nem conta e posições sem quantidade", () => {
    const income = transactionFromDoc("income", "1", { date: "2026-01-01", description: "x", value: 5 });
    expect(income.category).toBe("Outras receitas");
    expect(income.accountId).toBeNull();
    expect(positionFromDoc("1", { broker: "b", asset: "a", invested: 1, current: 2 }).quantity).toBeNull();
  });
});

describe("património", () => {
  const accounts = [
    account({ id: "c", value: 1000 }),
    account({ id: "s", type: "savings", value: 500 }),
    account({ id: "b", type: "brokerage", value: 9999 }),
    account({ id: "d", type: "liability", value: 300 }),
    account({ id: "x", type: "other_asset", value: 200, excludeFromNetWorth: true }),
    account({ id: "z", value: 700, archived: true }),
  ];

  it("subtrai passivos e ignora contas excluídas e arquivadas", () => {
    const summary = netWorthSummary(accounts.filter((a) => a.id !== "b"), []);
    expect(summary).toEqual({ assets: 1500, liabilities: 300, netWorth: 1200 });
  });

  it("não conta duas vezes uma corretora com posições associadas", () => {
    const summary = netWorthSummary(accounts, [position({ accountId: "b" })]);
    expect(summary.assets).toBe(1000 + 500 + 1200);
  });

  it("não soma posições sem conta e assinala-as", () => {
    const summary = netWorthSummary(accounts.filter((a) => a.id !== "b"), [position({})]);
    expect(summary.assets).toBe(1500);
    expect(unlinkedPositions(accounts, [position({})])).toHaveLength(1);
  });

  it("saldo disponível exclui poupança", () => {
    expect(availableBalance(accounts)).toBe(1000);
  });
});

describe("efeito nos saldos", () => {
  it("transferência move dinheiro sem criar receita nem despesa", () => {
    const t = tx({ kind: "transfer", value: 50, accountId: "a", toAccountId: "b" });
    expect(Object.fromEntries(netFlows(null, t))).toEqual({ a: -50, b: 50 });
    expect(monthSummary([t], "2026-10")).toMatchObject({ income: 0, expenses: 0, savings: 0 });
  });

  it("editar aplica só a diferença e apagar repõe", () => {
    const before = tx({ value: 10, accountId: "a" });
    expect(netFlows(before, { ...before, value: 25 }).get("a")).toBe(-15);
    expect(netFlows(before, null).get("a")).toBe(10);
  });

  it("mudar de conta devolve a uma e desconta da outra", () => {
    const before = tx({ value: 10, accountId: "a" });
    expect(Object.fromEntries(netFlows(before, { ...before, accountId: "b" }))).toEqual({ a: 10, b: -10 });
  });
});

describe("operações de investimento", () => {
  it("compra atualiza quantidade, custo e preço médio", () => {
    const { patch } = applyOperation(position({}), { kind: "buy", date: "", quantity: 10, price: 120, amount: 1200 });
    expect(patch).toMatchObject({ quantity: 20, invested: 2200, current: 2400, avgPrice: 110 });
  });

  it("venda parcial usa o custo médio e calcula o realizado", () => {
    const { patch, realizedPL } = applyOperation(position({}), { kind: "sell", date: "", quantity: 5, price: 130, amount: 650 });
    expect(patch).toMatchObject({ quantity: 5, invested: 500, current: 600 });
    expect(realizedPL).toBe(150);
  });

  it("venda total encerra a posição", () => {
    const { patch } = applyOperation(position({}), { kind: "sell", date: "", quantity: 10, price: 130, amount: 1300 });
    expect(patch).toMatchObject({ quantity: 0, invested: 0, current: 0 });
  });

  it("recusa operações sem quantidade ou acima do detido", () => {
    const op = { kind: "sell" as const, date: "", quantity: 11, price: 1, amount: 1 };
    expect(() => applyOperation(position({ quantity: null }), op)).toThrow();
    expect(() => applyOperation(position({}), op)).toThrow();
  });

  it("histórico usa o último valor conhecido e só datas reais", () => {
    const history = portfolioHistory(
      [
        { id: "1", positionId: "p", date: "2026-01-01", value: 100 },
        { id: "2", positionId: "q", date: "2026-02-01", value: 50 },
        { id: "3", positionId: "p", date: "2026-03-01", value: 120 },
        { id: "4", positionId: "apagada", date: "2026-03-01", value: 999 },
      ],
      new Set(["p", "q"]),
    );
    expect(history.map((h) => h.value)).toEqual([100, 150, 170]);
  });
});

describe("orçamentos", () => {
  it("só conta despesas da categoria e do mês", () => {
    const rows = budgetRows(
      [{ id: "1", category: "Lazer", limit: 100 }],
      [
        tx({ category: "Lazer", value: 90 }),
        tx({ category: "Lazer", value: 40, date: "2026-09-10" }),
        tx({ category: "Lazer", kind: "income", value: 500 }),
        tx({ category: "Casa", value: 500 }),
      ],
      "2026-10",
      "2026-09",
    );
    expect(rows[0]).toMatchObject({ spent: 90, previous: 40, remaining: 10, usedPct: 90 });
    expect(budgetStatus(90)).toBe("near");
    expect(budgetStatus(101)).toBe("over");
    expect(budgetStatus(50)).toBe("ok");
  });
});

describe("insights", () => {
  it("não inventa nada sem dados", () => {
    expect(buildInsights([], [], "2026-10")).toEqual([]);
  });

  it("não diz taxa de poupança sem receitas nem compara sem mês anterior", () => {
    const ids = buildInsights([tx({ value: 20 })], [], "2026-10").map((i) => i.id);
    expect(ids).toEqual([]);
  });

  it("calcula as frases a partir dos dados", () => {
    const texts = buildInsights(
      [
        tx({ kind: "income", value: 1000, category: "Salário" }),
        tx({ category: "Lazer", value: 112 }),
        tx({ category: "Lazer", value: 100, date: "2026-09-05" }),
        tx({ category: "Casa", value: 44 }),
        tx({ category: "Casa", value: 44 }),
      ],
      [],
      "2026-10",
    ).map((i) => i.text);
    expect(texts).toContain("A tua taxa de poupança este mês é de 80%.");
    expect(texts).toContain("Lazer representa 56% das despesas deste mês.");
    expect(texts).toContain("Gastaste mais 12% em Lazer face ao mês anterior.");
  });
});

describe("séries e exportação", () => {
  it("agrupa por dia em períodos curtos e por mês nos longos", () => {
    expect(cashflowSeries([], "2026-10-01", "2026-10-30")).toHaveLength(30);
    expect(cashflowSeries([], "2026-05-01", "2026-10-30")).toHaveLength(6);
  });

  it("gera CSV seguro para Excel", () => {
    const csv = transactionsCsv([tx({ description: '=1+1; "x"', value: 10.5 })], []);
    expect(csv.split("\r\n")[1]).toBe(`2026-10-05;Despesa;"'=1+1; ""x""";Outros;;;10,5;`);
  });
});
