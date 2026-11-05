import { expect, test, type Page } from "@playwright/test";
import {
  assumeAsSupport,
  createDisposableUser,
  createTicketAsCustomer,
  e2eTitle,
  fixedUser,
  fixedUserInfo,
  login,
  loginAndWait,
  setStatusAs,
} from "./support";

type Role = "CUSTOMER" | "SUPPORT" | "ADMIN";

async function openAs(page: Page, role: Role, ticketId: string) {
  const user = fixedUser(role);
  await loginAndWait(page, user.email, user.password);
  await page.goto(`/chamados/${ticketId}`);
}

/**
 * Locators por papel ARIA: o Next 16 mantém páginas anteriores ocultas no DOM
 * (Activity), e `getByRole` ignora elementos ocultos.
 */
function ui(page: Page, title: string) {
  const main = page.getByRole("main");
  return {
    heading: main.getByRole("heading", { name: title, level: 1 }),
    header: main.locator("header").filter({ hasText: title }),
    // `exact`: "Informações do chamado" contém "ações do chamado" como substring.
    actions: main.getByRole("region", { name: "Ações do chamado", exact: true }),
    info: main.getByRole("region", { name: "Informações do chamado" }),
    button: (name: string) => main.getByRole("button", { name, exact: true }),
    status: (text: string) => main.getByRole("status").filter({ hasText: text }),
    alert: (text: string) => main.getByRole("alert").filter({ hasText: text }),
  };
}

/** Nomes dos botões de ação visíveis, na ordem da tela. */
async function actionNames(page: Page, title: string) {
  const { actions } = ui(page, title);
  if ((await actions.count()) === 0) return [];
  return actions.getByRole("button").allInnerTexts();
}

test.describe("Detalhe do chamado", () => {
  test("mostra as informações e a descrição como texto", async ({ page }) => {
    const description = "<b>urgente</b>\n\nSegunda linha da descrição.";
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Detalhe"), description, priority: "HIGH" });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.heading).toBeVisible();
    await expect(v.header).toContainText("Aberto");
    await expect(v.header).toContainText("Alta");
    await expect(v.info).toContainText("Na fila");
    await expect(v.info).toContainText("Aberto em");
    await expect(v.info).not.toContainText("Fechado em");

    const text = page.getByRole("main").getByRole("region", { name: "Descrição" }).locator("p");
    await expect(text).toHaveText(description, { useInnerText: true });
    await expect(page.getByRole("main").locator("b", { hasText: "urgente" })).toHaveCount(0);
  });

  test("cliente fecha um chamado aberto com confirmação", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Cliente fecha") });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);
    await expect.poll(() => actionNames(page, ticket.title)).toEqual(["FECHAR CHAMADO"]);

    // Cancelar não envia nada.
    await v.button("Fechar chamado").click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Fechar este chamado?");
    await expect(dialog).toContainText("Depois de fechado, ele não pode ser reaberto.");
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(v.button("Fechar chamado")).toBeFocused();
    await expect(v.header).toContainText("Aberto");

    await v.button("Fechar chamado").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Fechar chamado" }).click();
    await expect(v.status("Chamado fechado.")).toBeVisible();
    await expect(v.header).toContainText("Fechado");
    await expect(v.info).toContainText("Fechado em");
    await expect(v.actions).toHaveCount(0);
  });

  test("atendente assume, aguarda o cliente e resolve", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Atendente") });
    const support = await fixedUserInfo("SUPPORT");
    await openAs(page, "SUPPORT", ticket.id);
    const v = ui(page, ticket.title);

    await expect.poll(() => actionNames(page, ticket.title)).toEqual(["ASSUMIR"]);
    await v.button("Assumir").click();
    await expect(v.status("Chamado assumido.")).toBeVisible();
    await expect(v.header).toContainText("Em andamento");
    await expect(v.info).toContainText(support.name);
    await expect.poll(() => actionNames(page, ticket.title)).toEqual(["RESOLVER", "AGUARDAR CLIENTE"]);

    await v.button("Aguardar cliente").click();
    await expect(v.status("Chamado aguardando o cliente.")).toBeVisible();
    await expect(v.header).toContainText("Aguardando cliente");
    await expect.poll(() => actionNames(page, ticket.title)).toEqual(["RESOLVER"]);

    await v.button("Resolver").click();
    await expect(v.status("Chamado resolvido.")).toBeVisible();
    await expect(v.header).toContainText("Resolvido");
    await expect(v.actions).toHaveCount(0);
  });

  test("cliente vê o aviso de resposta e depois reabre o chamado resolvido", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Cliente reabre") });
    await assumeAsSupport(ticket.id);
    await setStatusAs("SUPPORT", ticket.id, "WAITING_CUSTOMER");

    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);
    await expect(
      page.getByRole("main").getByRole("status").filter({
        hasText: "O atendimento aguarda sua resposta. Responda pelos comentários abaixo.",
      }),
    ).toBeVisible();
    await expect(v.button("Responder")).toBeVisible();
    await expect(v.actions).toHaveCount(0);

    await setStatusAs("SUPPORT", ticket.id, "RESOLVED");
    await page.reload();
    await expect.poll(() => actionNames(page, ticket.title)).toEqual(["REABRIR", "FECHAR CHAMADO"]);
    await v.button("Reabrir").click();
    await expect(v.status("Chamado reaberto.")).toBeVisible();
    await expect(v.header).toContainText("Em andamento");
    await expect(v.actions).toHaveCount(0);
  });

  test("administrador atribui e reatribui sem o atendente atual nas opções", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Admin atribui") });
    const support = await fixedUserInfo("SUPPORT");
    await openAs(page, "ADMIN", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.button("Atribuir")).toBeVisible();
    await expect(v.button("Fechar chamado")).toBeVisible();
    await v.actions.getByLabel("Atendente").selectOption({ label: support.name });
    await v.button("Atribuir").click();
    await expect(v.status(`Chamado atribuído a ${support.name}.`)).toBeVisible();
    await expect(v.header).toContainText("Em andamento");
    await expect(v.info).toContainText(support.name);

    // Reatribuir: o atendente atual não aparece entre as opções.
    await expect(v.button("Resolver")).toBeVisible();
    await expect(v.button("Aguardar cliente")).toBeVisible();
    const picker = v.actions.getByLabel("Atendente");
    if (await picker.count()) {
      await expect(picker.locator("option", { hasText: support.name })).toHaveCount(0);
      await expect(v.button("Reatribuir")).toBeVisible();
    } else {
      await expect(v.actions).toContainText("Nenhum atendente disponível para atribuição.");
    }
  });

  test("ação que deixou de valer → recarrega e explica (422)", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("422") });
    await assumeAsSupport(ticket.id);
    await setStatusAs("SUPPORT", ticket.id, "RESOLVED");
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);
    await expect(v.button("Fechar chamado")).toBeVisible();

    // Outra sessão reabre antes do clique: fechar deixa de ser permitido.
    await setStatusAs("CUSTOMER", ticket.id, "IN_PROGRESS");
    await v.button("Fechar chamado").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Fechar chamado" }).click();
    await expect(
      v.alert("Esta ação não está mais disponível para a situação atual do chamado."),
    ).toBeVisible();
    await expect(v.header).toContainText("Em andamento");
    await expect(v.actions).toHaveCount(0);
  });

  test("chamado que saiu da visibilidade durante a ação (404)", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("404") });
    await openAs(page, "SUPPORT", ticket.id);
    const v = ui(page, ticket.title);
    await expect(v.button("Assumir")).toBeVisible();

    // O cliente fecha o chamado da fila: ele deixa de ser visível ao atendente.
    await setStatusAs("CUSTOMER", ticket.id, "CLOSED");
    await v.button("Assumir").click();
    await expect(v.alert("Este chamado não está mais disponível para você.")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Voltar aos chamados" }).click();
    await expect(page).toHaveURL(/\/chamados$/);
  });

  test("chamado de outro cliente → Chamado não encontrado.", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Outro cliente") });
    const other = await createDisposableUser("detalhe");
    await login(page, other.email, other.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/chamados/${ticket.id}`);
    await expect(page.getByRole("heading", { name: "Chamado não encontrado.", level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(ticket.title);
  });

  test("sem scroll horizontal em 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Mobile") });
    await openAs(page, "ADMIN", ticket.id);
    await expect(ui(page, ticket.title).button("Atribuir")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await ui(page, ticket.title).button("Fechar chamado").boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
