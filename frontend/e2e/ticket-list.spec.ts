import { expect, test, type Page } from "@playwright/test";
import {
  createTicketAsCustomer,
  e2eTitle,
  ensureTicketCount,
  fixedUser,
  loginAndWait,
} from "./support";

/** Lista de chamados (cards ou linhas): cada item é um link para o detalhe. */
function ticketLinks(page: Page) {
  return page.getByRole("list").filter({ has: page.locator('a[href^="/chamados/"]') }).getByRole("link");
}

/** Nenhum chip de prioridade diferente do esperado (os totais da API compartilhada variam). */
async function expectOnlyPriority(page: Page, label: string) {
  const links = ticketLinks(page);
  await expect(links.first()).toBeVisible();
  for (const text of await links.allInnerTexts()) {
    expect(text).toContain(label);
  }
}

test.describe("Lista de chamados", () => {
  test("cliente filtra por prioridade e o filtro fica na URL", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ priority: "URGENT", title: e2eTitle("Urgente") });
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    await page.goto("/chamados");
    await expect(page.getByRole("heading", { name: "Meus chamados", level: 1 })).toBeVisible();
    await page.getByLabel("Prioridade").selectOption("URGENT");
    await expect(page).toHaveURL(/\/chamados\?priority=URGENT$/);
    await expect(page.getByRole("link", { name: new RegExp(escape(ticket.title)) })).toBeVisible();
    await expectOnlyPriority(page, "Urgente");

    // Voltar no navegador restaura a lista sem o filtro.
    await page.goBack();
    await expect(page).toHaveURL(/\/chamados$/);
    await expect(page.getByLabel("Prioridade")).toHaveValue("");
  });

  test("trocar filtro volta para a página 1 e mantém o outro filtro", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    await page.goto("/chamados?status=OPEN&page=3");
    await expect(page.getByLabel("Status")).toHaveValue("OPEN");
    await page.getByLabel("Prioridade").selectOption("HIGH");
    await expect(page).toHaveURL(/\/chamados\?status=OPEN&priority=HIGH$/);

    await page.getByRole("link", { name: "Limpar filtros" }).first().click();
    await expect(page).toHaveURL(/\/chamados$/);
  });

  test("parâmetros inválidos são descartados sem erro", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    await page.goto("/chamados?status=xyz&priority=LOW&page=abc");
    await expect(page.getByRole("heading", { name: "Chamados", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Status")).toHaveValue("");
    await expect(page.getByLabel("Prioridade")).toHaveValue("LOW");
    // A lista carrega normalmente (o `alert` vazio do anunciador de rotas do Next não conta).
    await expect(page.getByText("Não foi possível carregar os chamados.")).toHaveCount(0);
    await expect(ticketLinks(page).first()).toBeVisible();
  });

  test("cliente não vê cliente nem atendente; admin vê Na fila", async ({ page, browser }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Sem atendente") });
    const titleRe = new RegExp(escape(ticket.title));

    const customer = fixedUser("CUSTOMER");
    await loginAndWait(page, customer.email, customer.password);
    await page.goto("/chamados");
    const own = page.getByRole("link", { name: titleRe });
    await expect(own).toBeVisible();
    await expect(own).not.toContainText("Na fila");

    const adminPage = await (await browser.newContext({ ...test.info().project.use })).newPage();
    const admin = fixedUser("ADMIN");
    await loginAndWait(adminPage, admin.email, admin.password);
    await adminPage.goto("/chamados?status=OPEN");
    const row = adminPage.getByRole("link", { name: titleRe });
    await expect(row).toContainText("Na fila");

    // A linha leva ao detalhe do chamado.
    await row.click();
    await expect(adminPage).toHaveURL(new RegExp(`/chamados/${ticket.id}$`));
    await adminPage.context().close();
  });

  test("atendente tem o atalho Fila; cliente não", async ({ page }) => {
    const support = fixedUser("SUPPORT");
    await loginAndWait(page, support.email, support.password);
    await page.goto("/chamados");
    await page.getByRole("link", { name: "Fila", exact: true }).click();
    await expect(page).toHaveURL(/\/chamados\?status=OPEN$/);
    await expect(page.getByRole("link", { name: "Fila", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("cliente não vê o atalho Fila", async ({ page }) => {
    const customer = fixedUser("CUSTOMER");
    await loginAndWait(page, customer.email, customer.password);
    await page.goto("/chamados");
    await expect(page.getByRole("heading", { name: "Meus chamados", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fila", exact: true })).toHaveCount(0);
  });

  test("paginação de 20 em 20 mantendo a URL", async ({ page }) => {
    await ensureTicketCount(21);
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    await page.goto("/chamados");
    await expect(ticketLinks(page)).toHaveCount(20);
    await expect(page.getByText(/^Página 1 de \d+$/)).toBeVisible();
    await expect(page.getByText("Anterior")).toHaveAttribute("aria-disabled", "true");

    await page.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/\/chamados\?page=2$/);
    await expect(page.getByText(/^Página 2 de \d+$/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();
  });

  test("página além do total oferece voltar à primeira", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);
    await createTicketAsCustomer();

    await page.goto("/chamados?page=99999");
    await expect(page.getByText("Esta página não tem chamados.")).toBeVisible();
    await page.getByRole("link", { name: "Ir para a primeira página" }).click();
    await expect(page).toHaveURL(/\/chamados$/);
  });

  test("sem scroll horizontal em 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);
    await page.goto("/chamados");
    await expect(ticketLinks(page).first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
