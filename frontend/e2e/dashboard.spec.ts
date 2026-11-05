import { expect, test, type Page } from "@playwright/test";
import { apiUrl, createDisposableUser, fixedUser, loginAndWait } from "./support";

/** Os totais vêm de uma API compartilhada: os testes conferem estrutura e rótulos, não valores. */
async function expectCards(page: Page, labels: string[]) {
  for (const label of labels) {
    const card = page.getByRole("link", { name: new RegExp(`^${label} \\d`) });
    await expect(card).toBeVisible();
  }
}

async function expectPanels(page: Page, titles: string[]) {
  for (const title of titles) {
    await expect(page.getByRole("region", { name: title })).toBeVisible();
  }
}

test.describe("Painel por papel", () => {
  test("cliente: cartões e listas do cliente", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    await expectCards(page, ["Abertos", "Em andamento", "Aguardando sua resposta", "Resolvidos"]);
    await expect(page.getByRole("region", { name: "Fila por prioridade" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Categorias" })).toHaveCount(0);
  });

  test("atendente: cartões, fila e fila por prioridade", async ({ page }) => {
    const user = fixedUser("SUPPORT");
    await loginAndWait(page, user.email, user.password);

    await expectCards(page, ["Na fila", "Em atendimento", "Aguardando cliente", "Resolvidos"]);
    await expectPanels(page, ["Próximos da fila", "Fila por prioridade"]);
    const meter = page.getByRole("list", { name: "Fila por prioridade" });
    await expect(meter.getByRole("listitem")).toHaveText([/^Urgente\d/, /^Alta\d/, /^Média\d/, /^Baixa\d/]);
    await expect(page.getByRole("region", { name: "Categorias" })).toHaveCount(0);
  });

  test("atendente: cartão Na fila leva à lista filtrada", async ({ page }) => {
    const user = fixedUser("SUPPORT");
    await loginAndWait(page, user.email, user.password);

    await page.getByRole("link", { name: /^Na fila \d/ }).click();
    await expect(page).toHaveURL(/\/chamados\?status=OPEN$/);
  });

  test("administrador: cartões, gráficos e resumos", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    await expectCards(page, ["Sem atendente", "Em andamento", "Aguardando cliente", "Resolvidos"]);
    await expectPanels(page, ["Chamados por status", "Chamados por prioridade", "Categorias", "Usuários"]);

    // Alternativa textual dos gráficos (leitores de tela) com os números.
    await expect(page.getByRole("img", { name: /^Chamados por status: Abertos \d/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Chamados por prioridade: Urgente \d/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gerenciar categorias" })).toHaveAttribute("href", "/categorias");
    await expect(page.getByRole("link", { name: "Gerenciar usuários" })).toHaveAttribute("href", "/usuarios");
  });
});

test.describe("Painel do cliente novo", () => {
  test("estado vazio e, depois de abrir um chamado, o chamado nos recentes", async ({ page }) => {
    const user = await createDisposableUser("painel");
    await loginAndWait(page, user.email, user.password);

    await expect(page.getByText("Você ainda não abriu chamados.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Abrir chamado" })).toHaveAttribute(
      "href",
      "/chamados/novo",
    );

    const title = `[e2e-${Date.now()}] Painel do cliente`;
    await createTicketViaApi(user.email, user.password, title);

    await page.reload();
    const recent = page.getByRole("region", { name: "Chamados recentes" });
    await expect(recent.getByRole("link", { name: new RegExp(escapeRegExp(title)) })).toBeVisible();
    await expect(recent.getByText("Aberto", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Abertos 1$/ })).toBeVisible();
  });
});

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Abre um chamado direto na API como o cliente descartável (dado com prefixo único). */
async function createTicketViaApi(email: string, password: string, title: string) {
  const login = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Login do cliente descartável falhou: ${login.status}`);
  const { accessToken } = (await login.json()) as { accessToken: string };
  const auth = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const categories = (await (await fetch(apiUrl("/categories"), { headers: auth })).json()) as Array<{
    id: string;
  }>;
  if (categories.length === 0) {
    throw new Error("Nenhuma categoria ativa na API: crie uma para rodar este teste.");
  }

  const created = await fetch(apiUrl("/tickets"), {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title,
      description: "Chamado criado pelo teste E2E do painel.",
      priority: "LOW",
      categoryId: categories[0].id,
    }),
  });
  if (created.status !== 201) throw new Error(`Falha ao criar chamado: ${created.status}`);
}
