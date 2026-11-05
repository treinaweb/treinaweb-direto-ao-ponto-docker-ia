import { expect, test, type Page } from "@playwright/test";
import {
  apiUrl,
  assignAsAdmin,
  assumeAsSupport,
  commentAs,
  createDisposableSupport,
  createTicketAsCustomer,
  e2eTitle,
  fixedUser,
  listCommentsAs,
  loginAndWait,
  logout,
  setStatusAs,
} from "./support";

type Role = "CUSTOMER" | "SUPPORT" | "ADMIN";

async function openAs(page: Page, role: Role, ticketId: string) {
  const user = fixedUser(role);
  await loginAndWait(page, user.email, user.password);
  await page.goto(`/chamados/${ticketId}`);
}

/**
 * Locators por papel ARIA dentro de `main`: o Next 16 mantém páginas
 * anteriores ocultas no DOM (Activity), e `getByRole` ignora elementos ocultos.
 */
function ui(page: Page, title: string) {
  const main = page.getByRole("main");
  const comments = main.getByRole("region", { name: "Comentários", exact: true });
  return {
    main,
    comments,
    header: main.locator("header").filter({ hasText: title }),
    heading: main.getByRole("heading", { name: title, level: 1 }),
    field: comments.getByRole("textbox", { name: "Comentário", exact: true }),
    internal: comments.getByRole("checkbox", { name: "Nota interna (visível só para a equipe)" }),
    send: comments.getByRole("button", { name: "Enviar resposta", exact: true }),
    addNote: comments.getByRole("button", { name: "Adicionar nota interna", exact: true }),
    item: (text: string) => comments.getByRole("listitem").filter({ hasText: text }),
    status: (text: string) => main.getByRole("status").filter({ hasText: text }),
    alert: (text: string) => main.getByRole("alert").filter({ hasText: text }),
    button: (name: string) => main.getByRole("button", { name, exact: true }),
  };
}

test.describe("Comentários do chamado", () => {
  test("cliente responde: selo, data, texto literal, campo limpo e foco", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Comentário cliente") });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.comments).toContainText("Nenhum comentário ainda.");
    await expect(v.internal).toHaveCount(0);

    const body = "<b>urgente</b>\n\nSegue o print do erro.";
    await v.field.fill(`  ${body}  `);
    await v.send.click();

    await expect(v.status("Resposta enviada.")).toBeVisible();
    const item = v.item("Segue o print do erro.");
    await expect(item).toContainText("Cliente");
    await expect(item.locator("p")).toHaveText(body, { useInnerText: true });
    await expect(item.locator("b")).toHaveCount(0);
    await expect(item.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
    await expect(item.locator("time")).toHaveText(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
    await expect(v.field).toHaveValue("");
    await expect(v.field).toBeFocused();
    await expect(v.comments).not.toContainText("Nenhum comentário ainda.");
  });

  test("duplo clique em Enviar resposta cria um único comentário", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Duplo clique") });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Comentário enviado com duplo clique.");
    await v.send.dblclick();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await expect(v.item("Comentário enviado com duplo clique.")).toHaveCount(1);
    expect(await listCommentsAs("CUSTOMER", ticket.id)).toHaveLength(1);
  });

  test("comentário só com espaços → Escreva um comentário., nada enviado", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Só espaços") });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("      ");
    await v.send.click();
    await expect(v.comments.getByText("Escreva um comentário.")).toBeVisible();
    await expect(v.field).toHaveAttribute("aria-invalid", "true");
    await expect(v.field).toBeFocused();
    expect(await listCommentsAs("CUSTOMER", ticket.id)).toHaveLength(0);
  });

  test("atendente não atribuído lê a conversa e só responde depois de assumir", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Fila comentários") });
    await commentAs("CUSTOMER", ticket.id, "Comentário do cliente na fila.");
    await openAs(page, "SUPPORT", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.item("Comentário do cliente na fila.")).toContainText("Cliente");
    await expect(v.comments).toContainText("Assuma o chamado para responder.");
    await expect(v.field).toHaveCount(0);

    await v.button("Assumir").click();
    await expect(v.status("Chamado assumido.")).toBeVisible();
    await expect(v.field).toBeVisible();
    await expect(v.comments).not.toContainText("Assuma o chamado para responder.");
  });

  test("atendente envia resposta e nota interna; o cliente vê só a resposta", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Nota interna") });
    await assumeAsSupport(ticket.id);
    await openAs(page, "SUPPORT", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Resposta do atendente ao cliente.");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await expect(v.item("Resposta do atendente ao cliente.")).toContainText("Equipe");

    await v.field.fill("Nota só para a equipe.");
    await v.internal.check();
    await expect(v.addNote).toBeVisible();
    await v.addNote.click();
    await expect(v.status("Nota interna adicionada.")).toBeVisible();
    const note = v.item("Nota só para a equipe.");
    await expect(note).toContainText("Nota interna");
    await expect(note.locator("article")).toHaveAttribute("data-internal", "true");
    await expect(v.internal).not.toBeChecked();
    await expect(v.send).toBeVisible();

    await logout(page);
    await expect(page).toHaveURL(/\/login/);
    await openAs(page, "CUSTOMER", ticket.id);
    const c = ui(page, ticket.title);
    await expect(c.item("Resposta do atendente ao cliente.")).toBeVisible();
    await expect(c.comments).not.toContainText("Nota só para a equipe.");
    await expect(c.comments).not.toContainText("Nota interna");
  });

  test("cliente aguardando: Responder leva ao campo e a resposta retoma o atendimento", async ({ page }, testInfo) => {
    // No mobile, a largura mínima suportada (360px), com o campo fora da tela.
    if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 640 });
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Aguardando cliente") });
    await assumeAsSupport(ticket.id);
    await setStatusAs("SUPPORT", ticket.id, "WAITING_CUSTOMER");
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);
    const notice = v.status("O atendimento aguarda sua resposta. Responda pelos comentários abaixo.");

    await expect(notice).toBeVisible();
    if (testInfo.project.name === "mobile") await expect(v.field).not.toBeInViewport();
    await v.button("Responder").click();
    await expect(v.field).toBeFocused();
    await expect(v.field).toBeInViewport();

    await v.field.fill("Respondendo ao atendimento.");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await expect(v.header).toContainText("Em andamento");
    await expect(notice).toHaveCount(0);
  });

  test("comentário num chamado resolvido não reabre", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Resolvido comentário") });
    await assumeAsSupport(ticket.id);
    await setStatusAs("SUPPORT", ticket.id, "RESOLVED");
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Obrigado pela ajuda!");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await expect(v.item("Obrigado pela ajuda!")).toBeVisible();
    await expect(v.header).toContainText("Resolvido");
    await expect(v.button("Reabrir")).toBeVisible();
    await expect(v.button("Fechar chamado")).toBeVisible();
  });

  test("administrador comenta e adiciona nota num chamado da fila", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Admin comenta") });
    await openAs(page, "ADMIN", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Resposta do administrador.");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await expect(v.item("Resposta do administrador.")).toContainText("Equipe");

    await v.field.fill("Nota do administrador.");
    await v.internal.check();
    await v.addNote.click();
    await expect(v.status("Nota interna adicionada.")).toBeVisible();
    await expect(v.item("Nota do administrador.")).toContainText("Nota interna");
    await expect(v.internal).not.toBeChecked();
    await expect(v.header).toContainText("Aberto");
  });

  test("chamado fechado não mostra o campo", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Fechado sem campo") });
    await commentAs("CUSTOMER", ticket.id, "Comentário antes de fechar.");
    await setStatusAs("CUSTOMER", ticket.id, "CLOSED");
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.item("Comentário antes de fechar.")).toBeVisible();
    await expect(v.comments).toContainText("Chamado fechado não aceita novos comentários.");
    await expect(v.field).toHaveCount(0);
  });

  test("chamado fechado por outra sessão antes do envio (422)", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("422 comentário") });
    await openAs(page, "CUSTOMER", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Texto escrito antes do fechamento.");
    await setStatusAs("CUSTOMER", ticket.id, "CLOSED");
    await v.send.click();

    await expect(v.alert("Este chamado foi fechado e não aceita novos comentários.")).toBeVisible();
    await expect(v.header).toContainText("Fechado");
    await expect(v.comments).toContainText("Chamado fechado não aceita novos comentários.");
    await expect(v.field).toHaveCount(0);
  });

  test("atendente perde o chamado antes do envio (404)", async ({ page }) => {
    const ticket = await createTicketAsCustomer({ title: e2eTitle("404 comentário") });
    const other = await createDisposableSupport("comentario");
    await assumeAsSupport(ticket.id);
    await openAs(page, "SUPPORT", ticket.id);
    const v = ui(page, ticket.title);

    await v.field.fill("Texto de quem perdeu o chamado.");
    await assignAsAdmin(ticket.id, other.id);
    await v.send.click();

    await expect(v.alert("Este chamado não está mais disponível para você.")).toBeVisible();
    await expect(v.field).toHaveCount(0);
    await v.comments.getByRole("link", { name: "Voltar aos chamados" }).click();
    await expect(page).toHaveURL(/\/chamados$/);
  });

  test("sem scroll horizontal em 360px, com nota interna e palavra longa", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const ticket = await createTicketAsCustomer({ title: e2eTitle("Mobile comentários") });
    await commentAs("CUSTOMER", ticket.id, `https://exemplo.com/${"a".repeat(300)}`);
    await commentAs("ADMIN", ticket.id, "Nota interna no mobile.", true);
    await openAs(page, "ADMIN", ticket.id);
    const v = ui(page, ticket.title);

    await expect(v.item("Nota interna no mobile.")).toContainText("Nota interna");
    await expect(v.item("https://exemplo.com/")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const send = await v.send.boundingBox();
    expect(send!.height).toBeGreaterThanOrEqual(44);
    const fieldBox = await v.field.boundingBox();
    // Botão na largura disponível, abaixo do campo.
    expect(Math.abs(send!.width - fieldBox!.width)).toBeLessThanOrEqual(2);
    const option = await v.comments.locator("label").filter({ hasText: "Nota interna (visível só para a equipe)" }).boundingBox();
    expect(option!.height).toBeGreaterThanOrEqual(44);
  });

  test("nenhuma requisição sai do navegador para a API (três papéis)", async ({ page }) => {
    const apiOrigin = new URL(apiUrl("/")).origin;
    const toApi: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).origin === apiOrigin) toApi.push(request.url());
    });

    const ticket = await createTicketAsCustomer({ title: e2eTitle("Network comentários") });
    await commentAs("CUSTOMER", ticket.id, "Comentário inicial.");

    await openAs(page, "CUSTOMER", ticket.id);
    let v = ui(page, ticket.title);
    await expect(v.item("Comentário inicial.")).toBeVisible();
    await v.field.fill("Resposta do cliente (network).");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();
    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    await assumeAsSupport(ticket.id);
    await openAs(page, "SUPPORT", ticket.id);
    v = ui(page, ticket.title);
    await v.field.fill("Nota do atendente (network).");
    await v.internal.check();
    await v.addNote.click();
    await expect(v.status("Nota interna adicionada.")).toBeVisible();
    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    await openAs(page, "ADMIN", ticket.id);
    v = ui(page, ticket.title);
    await expect(v.item("Nota do atendente (network).")).toBeVisible();
    await v.field.fill("Resposta do administrador (network).");
    await v.send.click();
    await expect(v.status("Resposta enviada.")).toBeVisible();

    expect(toApi).toEqual([]);
  });
});
