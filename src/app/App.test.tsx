import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app/App";
import { AppProviders } from "@/app/AppProviders";
import { failures, resetFakeFirebase, store } from "@/test/fakeFirebase";

vi.mock("firebase/app", () => import("@/test/fakeFirebase"));
vi.mock("firebase/auth", () => import("@/test/fakeFirebase"));
vi.mock("firebase/firestore", () => import("@/test/fakeFirebase"));

const UID = "ana@exemplo.pt";
const statValue = (label: string) => screen.getByText(label).nextElementSibling;
const money = (text: string) => text.replace(/\s/g, " ");

async function login() {
  const user = userEvent.setup();
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
  await user.type(await screen.findByPlaceholderText("Email"), UID);
  await user.type(screen.getByPlaceholderText(/Palavra-passe/), "segredo");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByRole("button", { name: "Sair" });
  return user;
}

async function addAccount(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  category: string,
  value: string,
) {
  // clear: o user-event não vê o form.reset() do jsdom e continuaria o texto anterior.
  await user.clear(screen.getByPlaceholderText(/Nome/));
  await user.type(screen.getByPlaceholderText(/Nome/), name);
  await user.selectOptions(screen.getByRole("combobox"), category);
  await user.clear(screen.getByPlaceholderText("Valor"));
  await user.type(screen.getByPlaceholderText("Valor"), value);
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  await screen.findByRole("cell", { name });
}

beforeEach(() => {
  resetFakeFirebase();
  window.history.pushState({}, "", "/");
});

afterEach(() => vi.restoreAllMocks());

describe("autenticação", () => {
  it("mostra o código de erro quando o login falha", async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await user.type(await screen.findByPlaceholderText("Email"), UID);
    await user.type(screen.getByPlaceholderText(/Palavra-passe/), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível: auth/invalid-credential",
    );
  });

  it("volta ao login ao sair", async () => {
    const user = await login();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByPlaceholderText("Email")).toBeInTheDocument();
  });
});

describe("visão geral", () => {
  it("exclui Subsídio dos ativos e conta só Cash como disponível", async () => {
    const user = await login();
    await addAccount(user, "Santander", "Cash", "100");
    await addAccount(user, "Corretora", "Investimentos", "50");
    await addAccount(user, "Subsídio férias", "Subsídio", "1000");

    expect(money(statValue("Ativos totais")!.textContent!)).toBe("150,00 €");
    expect(money(statValue("Saldo disponível")!.textContent!)).toBe("100,00 €");
  });

  it("pede confirmação e não apaga se for recusada", async () => {
    const user = await login();
    await addAccount(user, "Santander", "Cash", "100");

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(confirm).toHaveBeenCalledWith("Apagar este registo?");
    expect(screen.getByRole("cell", { name: "Santander" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(await screen.findByText("Sem contas. Adiciona a primeira acima.")).toBeInTheDocument();
  });
});

describe("despesas", () => {
  it("desconta da conta ao registar e devolve ao apagar", async () => {
    const user = await login();
    await addAccount(user, "Santander", "Cash", "100.10");
    await user.click(screen.getByRole("link", { name: "Despesas" }));

    await screen.findByRole("option", { name: "Santander" });
    await user.type(screen.getByPlaceholderText("Descrição"), "Almoço");
    await user.type(screen.getByPlaceholderText("Valor"), "20.05");
    await user.click(screen.getByRole("button", { name: "Registar" }));

    const row = (await screen.findByRole("cell", { name: "Almoço" })).closest("tr")!;
    expect(within(row).getByText(/Restaurantes\/Café · Santander/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Valor")).toHaveValue(null);

    const accounts = store.get(`users/${UID}/accounts`)!;
    const [account] = [...accounts.values()];
    expect(account!.value).toBe(80.05);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(within(row).getByRole("button", { name: "Apagar" }));
    await screen.findByText("Sem despesas");
    expect([...accounts.values()][0]!.value).toBe(100.1);

    await user.click(screen.getByRole("link", { name: "Visão Geral" }));
    expect(money(statValue("Saldo disponível")!.textContent!)).toBe("100,10 €");
  });

  it("não grava nada e mantém o formulário se a escrita falhar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await login();
    await user.click(screen.getByRole("link", { name: "Despesas" }));
    await screen.findByText("Sem despesas");

    failures.writes = true;
    await user.type(screen.getByPlaceholderText("Valor"), "20");
    await user.click(screen.getByRole("button", { name: "Registar" }));

    expect(await screen.findByText(/Não foi possível guardar/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Valor")).toHaveValue(20);
    expect(screen.getByText("Sem despesas")).toBeInTheDocument();
  });
});

describe("receitas", () => {
  it("regista receita sem alterar contas", async () => {
    const user = await login();
    await addAccount(user, "Santander", "Cash", "100");
    await user.click(screen.getByRole("link", { name: "Receitas" }));

    await user.type(screen.getByPlaceholderText("Descrição"), "Salário");
    await user.type(screen.getByPlaceholderText("Valor"), "1500");
    await user.click(screen.getByRole("button", { name: "Registar" }));

    await screen.findByRole("cell", { name: "Salário" });
    expect(money(statValue("Total receitas")!.textContent!)).toBe("1500,00 €");
    expect([...store.get(`users/${UID}/accounts`)!.values()][0]!.value).toBe(100);
  });
});

describe("investimentos", () => {
  it("calcula lucro/prejuízo por posição e total", async () => {
    const user = await login();
    await user.click(screen.getByRole("link", { name: "Investimentos" }));

    await user.type(screen.getByPlaceholderText("Broker"), "XTB");
    await user.type(screen.getByPlaceholderText("Ativo"), "VWCE");
    await user.type(screen.getByPlaceholderText("Investido"), "100");
    await user.type(screen.getByPlaceholderText("Valor atual"), "80");
    await user.click(screen.getByRole("button", { name: "Registar" }));

    await screen.findByRole("cell", { name: "VWCE" });
    const pl = statValue("Lucro/Prejuízo")!;
    expect(pl).toHaveClass("stat", "neg");
    expect(money(pl.textContent!)).toBe("-20,00 €");
  });
});
