import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app/App";
import { AppProviders } from "@/app/AppProviders";
import { setBalancesHidden } from "@/shared/lib/privacy";
import { failures, resetFakeFirebase, seed, store } from "@/test/fakeFirebase";

vi.mock("firebase/app", () => import("@/test/fakeFirebase"));
vi.mock("firebase/auth", () => import("@/test/fakeFirebase"));
vi.mock("firebase/firestore", () => import("@/test/fakeFirebase"));

const UID = "ana@exemplo.pt";
const path = (name: string) => `users/${UID}/${name}`;
const values = (name: string) => [...(store.get(path(name))?.values() ?? [])];
const normalize = (text: string | null) => (text ?? "").replace(/\s/g, " ");
const statValue = (label: string) =>
  normalize(screen.getByText(label, { selector: ".stat-label" }).nextElementSibling!.textContent);

function start() {
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

async function login() {
  const user = userEvent.setup();
  start();
  await user.type(await screen.findByLabelText("Email"), UID);
  await user.type(screen.getByLabelText("Palavra-passe"), "segredo");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findAllByText("Terminar sessão");
  return user;
}

const navigate = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(within(screen.getByRole("navigation", { name: name === "Relatórios" ? "Análise" : "Principal" })).getByRole("link", { name }));

async function saveMovement(
  user: ReturnType<typeof userEvent.setup>,
  fill: (dialog: HTMLElement) => Promise<void>,
) {
  await user.click(screen.getAllByRole("button", { name: "Novo movimento" })[0]!);
  const dialog = await screen.findByRole("dialog", { name: "Novo movimento" });
  await fill(dialog);
  await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
}

beforeEach(() => {
  resetFakeFirebase();
  setBalancesHidden(false);
  window.history.pushState({}, "", "/");
});

afterEach(() => vi.restoreAllMocks());

describe("autenticação", () => {
  it("mostra o código de erro quando o login falha", async () => {
    const user = userEvent.setup();
    start();
    await user.type(await screen.findByLabelText("Email"), UID);
    await user.type(screen.getByLabelText("Palavra-passe"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível: auth/invalid-credential");
  });

  it("volta ao login ao terminar sessão", async () => {
    const user = await login();
    await user.click(screen.getAllByText("Terminar sessão")[0]!);
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
  });
});

describe("dados existentes", () => {
  it("apresenta documentos da versão anterior sem os alterar", async () => {
    seed(path("accounts"), "a1", { name: "Santander", category: "Cash", value: 100 });
    seed(path("accounts"), "a2", { name: "Subsídio", category: "Subsídio", value: 500 });
    seed(path("expenses"), "e1", { date: "2026-01-02", category: "Lazer", accountId: "a1", description: "Cinema", value: 8 });
    seed(path("income"), "i1", { date: "2026-01-03", description: "Salário jan", value: 900 });
    seed(path("investments"), "p1", { date: "2026-01-01", broker: "XTB", asset: "VWCE", invested: 100, current: 120 });

    await login();
    await waitFor(() => expect(statValue("Património líquido")).toBe("100,00 €"));
    expect(statValue("Saldo disponível")).toBe("100,00 €");
    expect(statValue("Valor do portefólio")).toBe("120,00 €");
    expect(screen.getByText(/1 posição sem conta de corretora/)).toBeInTheDocument();
    expect(store.get(path("accounts"))!.get("a1")).toEqual({ name: "Santander", category: "Cash", value: 100 });
  });

  it("redireciona as rotas antigas", async () => {
    window.history.pushState({}, "", "/despesas");
    await login();
    await waitFor(() => expect(window.location.search).toBe("?tipo=despesas"));
    expect(window.location.pathname).toBe("/transacoes");
  });

  it("continua a funcionar se as regras bloquearem coleções novas", async () => {
    seed(path("expenses"), "e1", { date: "2026-01-02", category: "Lazer", description: "Cinema", value: 8 });
    failures.blockedCollections = ["transfers"];
    window.history.pushState({}, "", "/transacoes");
    await login();
    expect((await screen.findAllByText("Cinema")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/regras de segurança do Firestore bloqueiam/)).toBeInTheDocument();
  });
});

describe("movimentos", () => {
  beforeEach(() => {
    seed(path("accounts"), "a1", { name: "Santander", type: "checking", value: 100.1 });
    seed(path("accounts"), "a2", { name: "Poupança", type: "savings", value: 50 });
  });

  it("valida o formulário antes de gravar", async () => {
    const user = await login();
    await navigate(user, "Transações");
    await saveMovement(user, async () => {});
    expect(await screen.findByText("Indica um montante superior a 0.")).toBeInTheDocument();
    expect(values("expenses")).toEqual([]);
  });

  it("despesa desconta, editar acerta a diferença e eliminar repõe", async () => {
    const user = await login();
    await navigate(user, "Transações");
    await saveMovement(user, async (dialog) => {
      await user.type(within(dialog).getByLabelText("Montante (€)"), "20.05");
      await user.type(within(dialog).getByLabelText("Descrição"), "Almoço");
    });
    await screen.findByText("Movimento registado");
    await waitFor(() => expect(store.get(path("accounts"))!.get("a1")!.value).toBe(80.05));

    await user.click(await screen.findByRole("button", { name: "Editar Almoço" }));
    const edit = await screen.findByRole("dialog", { name: "Editar movimento" });
    const amount = within(edit).getByLabelText("Montante (€)");
    await user.clear(amount);
    await user.type(amount, "30");
    await user.click(within(edit).getByRole("button", { name: "Guardar" }));
    await screen.findByText("Movimento atualizado");
    expect(store.get(path("accounts"))!.get("a1")!.value).toBe(70.1);

    await user.click(await screen.findByRole("button", { name: "Eliminar Almoço" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }));
    await screen.findByText("Movimento eliminado");
    expect(store.get(path("accounts"))!.get("a1")!.value).toBe(100.1);
    expect(values("expenses")).toEqual([]);
  });

  it("cancelar a confirmação não elimina", async () => {
    seed(path("expenses"), "e1", { date: "2026-01-02", category: "Lazer", accountId: "a1", description: "Cinema", value: 8 });
    window.history.pushState({}, "", "/transacoes");
    const user = await login();
    await user.click(await screen.findByRole("button", { name: "Eliminar Cinema" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
    expect(values("expenses")).toHaveLength(1);
  });

  it("transferência move saldo e não conta como receita nem despesa", async () => {
    const user = await login();
    await navigate(user, "Transações");
    await saveMovement(user, async (dialog) => {
      await user.click(within(dialog).getByRole("button", { name: "Transferência" }));
      await user.type(within(dialog).getByLabelText("Montante (€)"), "40");
      await user.selectOptions(within(dialog).getByLabelText("Conta de origem"), "a1");
      await user.selectOptions(within(dialog).getByLabelText("Conta de destino"), "a2");
    });
    await screen.findByText("Movimento registado");
    expect(store.get(path("accounts"))!.get("a1")!.value).toBe(60.1);
    expect(store.get(path("accounts"))!.get("a2")!.value).toBe(90);
    expect(values("expenses")).toEqual([]);
    expect(values("income")).toEqual([]);
    expect(values("transfers")).toHaveLength(1);
  });

  it("recusa transferência para a mesma conta", async () => {
    const user = await login();
    await navigate(user, "Transações");
    await saveMovement(user, async (dialog) => {
      await user.click(within(dialog).getByRole("button", { name: "Transferência" }));
      await user.type(within(dialog).getByLabelText("Montante (€)"), "40");
      await user.selectOptions(within(dialog).getByLabelText("Conta de origem"), "a1");
      await user.selectOptions(within(dialog).getByLabelText("Conta de destino"), "a1");
    });
    expect(await screen.findByText(/tem de ser diferente/)).toBeInTheDocument();
    expect(values("transfers")).toEqual([]);
  });

  it("mantém o formulário aberto e avisa quando a escrita falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await login();
    await navigate(user, "Transações");
    failures.writes = true;
    await saveMovement(user, async (dialog) => {
      await user.type(within(dialog).getByLabelText("Montante (€)"), "20");
    });
    expect(await screen.findByText(/Não foi possível guardar/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Novo movimento" })).toBeInTheDocument();
    expect(store.get(path("accounts"))!.get("a1")!.value).toBe(100.1);
  });
});

describe("contas", () => {
  it("cria uma dívida que reduz o património e arquiva contas", async () => {
    seed(path("accounts"), "a1", { name: "Santander", type: "checking", value: 1000 });
    const user = await login();
    await navigate(user, "Contas");
    await user.click(await screen.findByRole("button", { name: "Nova conta" }));
    const dialog = await screen.findByRole("dialog", { name: "Nova conta" });
    await user.type(within(dialog).getByLabelText("Nome"), "Crédito");
    await user.selectOptions(within(dialog).getByLabelText("Tipo"), "liability");
    await user.type(within(dialog).getByLabelText("Valor em dívida (€)"), "300");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await screen.findByText("Conta criada");
    await waitFor(() => expect(statValue("Património líquido")).toBe("700,00 €"));

    await user.click(screen.getByRole("button", { name: /Crédito/ }));
    const details = await screen.findByRole("dialog", { name: "Crédito" });
    await user.click(within(details).getByRole("button", { name: "Arquivar" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Arquivar" }));
    await screen.findByText("Conta arquivada");
    await waitFor(() => expect(statValue("Património líquido")).toBe("1000,00 €"));
  });
});

describe("orçamentos", () => {
  it("cria orçamento e mostra o consumo real", async () => {
    const month = new Date().toLocaleDateString("sv").slice(0, 7);
    seed(path("expenses"), "e1", { date: `${month}-01`, category: "Lazer", description: "x", value: 90 });
    const user = await login();
    await navigate(user, "Orçamentos");
    await user.click((await screen.findAllByRole("button", { name: "Novo orçamento" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Novo orçamento" });
    await user.selectOptions(within(dialog).getByLabelText("Categoria"), "Lazer");
    await user.type(within(dialog).getByLabelText("Limite mensal (€)"), "100");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Perto do limite")).toBeInTheDocument();
    expect(statValue("Total gasto")).toBe("90,00 €");
  });
});

describe("investimentos", () => {
  beforeEach(() => {
    seed(path("accounts"), "b1", { name: "XTB", type: "brokerage", value: 5000 });
    seed(path("investments"), "p1", {
      date: "2026-01-01", broker: "XTB", asset: "VWCE", assetType: "etf", quantity: 10, avgPrice: 100,
      currency: "EUR", invested: 1000, current: 1200, accountId: "b1",
    });
  });

  it("atualiza valorização, regista venda e não duplica no património", async () => {
    const user = await login();
    await waitFor(() => expect(statValue("Património líquido")).toBe("1200,00 €"));
    await navigate(user, "Investimentos");

    await user.click(await screen.findByRole("button", { name: "Atualizar valorização de VWCE" }));
    const valuation = await screen.findByRole("dialog");
    await user.type(within(valuation).getByLabelText("Valor da posição (€)"), "1500");
    await user.click(within(valuation).getByRole("button", { name: "Guardar" }));
    await screen.findByText("Valorização registada");
    await waitFor(() => expect(statValue("Valor atual")).toBe("1500,00 €"));
    expect(values("investmentValuations")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Registar venda de VWCE" }));
    const sale = await screen.findByRole("dialog");
    await user.type(within(sale).getByLabelText("Quantidade"), "5");
    await user.type(within(sale).getByLabelText("Preço por unidade (EUR)"), "150");
    await user.click(within(sale).getByRole("button", { name: "Guardar" }));
    await screen.findByText("Venda registada");
    await waitFor(() => expect(statValue("Capital investido")).toBe("500,00 €"));
    expect(statValue("Valor atual")).toBe("750,00 €");
    expect(values("investmentOperations")[0]).toMatchObject({ kind: "sell", amount: 750, realizedPL: 250 });
  });

  it("recusa venda de posição antiga sem quantidade", async () => {
    seed(path("investments"), "p2", { date: "2026-01-01", broker: "DEGIRO", asset: "Antiga", invested: 1, current: 2 });
    const user = await login();
    await navigate(user, "Investimentos");
    await user.click(await screen.findByRole("button", { name: "Registar venda de Antiga" }));
    expect(await screen.findByRole("button", { name: "Definir quantidade" })).toBeInTheDocument();
  });

  it("eliminar remove operações e valorizações da posição", async () => {
    seed(path("investmentValuations"), "v1", { positionId: "p1", date: "2026-02-01", value: 1 });
    seed(path("investmentValuations"), "v2", { positionId: "outra", date: "2026-02-01", value: 1 });
    const user = await login();
    await navigate(user, "Investimentos");
    await user.click(await screen.findByRole("button", { name: "Eliminar VWCE" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));
    await screen.findByText("Posição eliminada");
    expect(values("investments")).toEqual([]);
    expect(values("investmentValuations")).toHaveLength(1);
  });
});

describe("ocultar saldos", () => {
  it("oculta e mostra os valores sem alterar os dados e lembra a escolha", async () => {
    seed(path("accounts"), "a1", { name: "Santander", type: "checking", value: 1234.5 });
    const user = await login();
    await waitFor(() => expect(statValue("Património líquido")).toBe("1234,50 €"));

    await user.click(screen.getByRole("button", { name: "Ocultar saldos" }));
    expect(statValue("Património líquido")).toBe("•••• €");
    expect(document.body.textContent).not.toContain("1234,50");
    expect(localStorage.getItem("financas.hideBalances")).toBe("1");
    expect(store.get(path("accounts"))!.get("a1")!.value).toBe(1234.5);

    await user.click(screen.getByRole("button", { name: "Mostrar saldos" }));
    expect(statValue("Património líquido")).toBe("1234,50 €");
  });
});

describe("estados vazios e relatórios", () => {
  it("dashboard sem dados não mostra indicadores fictícios", async () => {
    await login();
    expect(await screen.findByText("Começa por adicionar uma conta")).toBeInTheDocument();
    expect(screen.queryByText("Património líquido")).not.toBeInTheDocument();
    expect(values("netWorthSnapshots")).toEqual([]);
  });

  it("regista o património do mês uma só vez enquanto não muda", async () => {
    seed(path("accounts"), "a1", { name: "S", type: "checking", value: 100 });
    const user = await login();
    await waitFor(() => expect(values("netWorthSnapshots")).toHaveLength(1));
    expect(values("netWorthSnapshots")[0]).toMatchObject({ netWorth: 100 });
    await navigate(user, "Contas");
    await navigate(user, "Dashboard");
    await screen.findByText("Património líquido");
    expect(values("netWorthSnapshots")).toHaveLength(1);
  });

  it("relatórios sem dados mostram estado vazio", async () => {
    const user = await login();
    await navigate(user, "Relatórios");
    expect(await screen.findByText("Sem dados neste período")).toBeInTheDocument();
  });
});
