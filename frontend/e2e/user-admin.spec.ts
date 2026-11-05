import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  countUsersByEmail,
  createDisposableUser,
  findUserPage,
  fixedUser,
  loginAndWait,
  uniqueEmail,
} from "./support";

/*
 * Administração de usuários contra a API real, com o ADMIN fixo. A lista é
 * compartilhada e cresce enquanto os testes rodam (outros testes criam
 * usuários): nenhum teste depende do total, da posição global nem da última
 * página. Usuários são achados pelo e-mail com `findUserPage`.
 *
 * Regras: o papel dos usuários fixos NUNCA é alterado (só o de descartáveis),
 * e o formulário só cadastra atendentes (nunca administradores).
 */

async function openUsers(page: Page, path = "/usuarios") {
  const admin = fixedUser("ADMIN");
  await loginAndWait(page, admin.email, admin.password);
  await page.goto(path);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Usuários", level: 1 })).toBeVisible();
  return main;
}

function userList(main: Locator) {
  return main.getByRole("list", { name: "Usuários", exact: true });
}

/** Linha da lista pelo e-mail (único), nunca pela posição. */
function userRow(main: Locator, email: string) {
  return userList(main).getByRole("listitem").filter({ hasText: email });
}

function pageLabel(main: Locator, page: number | "any") {
  return main.getByText(page === "any" ? /^Página \d+ de \d+$/ : new RegExp(`^Página ${page} de \\d+$`));
}

test.describe("Lista de usuários", () => {
  test("título, Novo usuário, colunas e papel em texto", async ({ page, isMobile }) => {
    const main = await openUsers(page);

    await expect(main.getByRole("link", { name: "Novo usuário" })).toHaveAttribute("href", "/usuarios/novo");
    await expect(main.getByText(/^\d[\d.]* usuários$/)).toBeVisible();
    await expect(userList(main).getByRole("listitem")).toHaveCount(25);

    // Cabeçalho da grade só a partir de md (no mobile cada usuário é um card).
    const header = main.locator('div[aria-hidden="true"]', { hasText: "Cadastrado em" });
    if (isMobile) {
      await expect(header).toBeHidden();
    } else {
      await expect(header).toBeVisible();
      await expect(header).toHaveText(/^Nome\s*E-mail\s*Papel\s*Cadastrado em$/);
    }

    // Papel sempre em texto.
    const roles = await userList(main).getByRole("listitem").allInnerTexts();
    for (const text of roles) {
      expect(text).toMatch(/Cliente|Atendente|Administrador/);
    }
  });

  test("somente as ações que a API oferece, sem busca nem filtro", async ({ page }) => {
    const main = await openUsers(page);
    const rows = userList(main).getByRole("listitem");
    await expect(rows.first()).toBeVisible();

    for (const name of [/editar/i, /excluir/i, /desativar/i, /remover/i]) {
      await expect(main.getByRole("button", { name })).toHaveCount(0);
      await expect(main.getByRole("link", { name })).toHaveCount(0);
    }
    await expect(main.getByRole("searchbox")).toHaveCount(0);
    await expect(main.getByRole("textbox")).toHaveCount(0);
    await expect(main.getByRole("combobox")).toHaveCount(0);

    // Cada linha de outro usuário tem só o botão "Mudar papel de {nome}".
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const buttons = rows.nth(i).getByRole("button");
      const n = await buttons.count();
      expect(n).toBeLessThanOrEqual(1);
      if (n === 1) await expect(buttons).toHaveAccessibleName(/^Mudar papel de /);
    }
  });

  test("linha do próprio administrador com Você e sem Mudar papel", async ({ page }) => {
    const admin = fixedUser("ADMIN");
    const { page: adminPage } = await findUserPage(admin.email);
    const main = await openUsers(page, adminPage > 1 ? `/usuarios?page=${adminPage}` : "/usuarios");

    const row = userRow(main, admin.email.toLowerCase());
    await expect(row).toBeVisible();
    await expect(row).toContainText("Você");
    await expect(row).toContainText("Administrador");
    await expect(row.getByRole("button")).toHaveCount(0);
  });

  test("Próxima leva à página 2 e o voltar do navegador à página 1", async ({ page }) => {
    const main = await openUsers(page);
    await expect(pageLabel(main, 1)).toBeVisible();
    await expect(main.getByText("Anterior", { exact: true })).toHaveAttribute("aria-disabled", "true");

    await main.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/\/usuarios\?page=2$/);
    await expect(pageLabel(main, 2)).toBeVisible();
    await expect(main.getByRole("link", { name: "Anterior" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(pageLabel(main, 1)).toBeVisible();
  });

  test("página inválida na URL abre a página 1", async ({ page }) => {
    const main = await openUsers(page, "/usuarios?page=abc");
    await expect(pageLabel(main, 1)).toBeVisible();

    await page.goto("/usuarios?page=-1");
    await expect(pageLabel(main, 1)).toBeVisible();
    await expect(userList(main).getByRole("listitem")).toHaveCount(25);
  });

  test("página além do total oferece voltar à primeira", async ({ page }) => {
    const main = await openUsers(page, "/usuarios?page=9999");
    await expect(main.getByRole("heading", { name: "Esta página não tem usuários." })).toBeVisible();
    await expect(userList(main)).toHaveCount(0);

    await main.getByRole("link", { name: "Ir para a primeira página" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(pageLabel(main, 1)).toBeVisible();
  });

  test("sem scroll horizontal em 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const main = await openUsers(page);
    await expect(userList(main).getByRole("listitem").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const button = userList(main).getByRole("button").first();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

/** Cliente descartável com nome único (nomes repetidos confundiriam os botões). */
async function disposableCustomer(tag: string) {
  const unique = `${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return createDisposableUser(unique);
}

/** Abre `/usuarios` na página do usuário e devolve a linha e o botão dele. */
async function openUserRow(page: Page, email: string, name: string) {
  const { page: userPage } = await findUserPage(email);
  const main = await openUsers(page, userPage > 1 ? `/usuarios?page=${userPage}` : "/usuarios");
  const row = userRow(main, email);
  const button = row.getByRole("button", { name: `Mudar papel de ${name}`, exact: true });
  await expect(button).toBeVisible();
  return { main, row, button };
}

async function apiRoleOf(email: string) {
  return (await findUserPage(email)).user.role;
}

function roleDialog(page: Page, name: string) {
  return page.getByRole("alertdialog", { name: `Mudar papel de ${name}` });
}

function statusText(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

test.describe("Mudar papel (usuários descartáveis)", () => {
  test("cliente: só Atendente/Administrador; Cancelar, Esc e confirmar sem escolha não mudam nada", async ({ page }) => {
    const user = await disposableCustomer("papel-cancelar");
    const { row, button } = await openUserRow(page, user.email, user.name);
    await expect(row).toContainText("Cliente");

    await button.click();
    const dialog = roleDialog(page, user.name);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Papel atual: Cliente");
    const select = dialog.getByLabel("Novo papel");
    await expect(select).toHaveValue("");
    await expect(select.locator("option")).toHaveText(["Selecione o novo papel", "Atendente", "Administrador"]);

    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await dialog.getByRole("button", { name: "Mudar papel", exact: true }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Selecione o novo papel." })).toBeVisible();
    await expect(dialog).toBeVisible();

    // Com o diálogo aberto o resto da página fica inerte; fecha para conferir a linha.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("Cliente");
    expect(await apiRoleOf(user.email)).toBe("CUSTOMER");
  });

  test("promover a Atendente e rebaixar a Cliente com o aviso de chamados atribuídos", async ({ page }) => {
    const user = await disposableCustomer("papel-promover");
    const { row, button } = await openUserRow(page, user.email, user.name);
    const url = page.url();
    const dialog = roleDialog(page, user.name);
    const warning = `Chamados atribuídos a ${user.name} continuam atribuídos a essa pessoa. Reatribua-os pelo detalhe do chamado.`;

    await button.click();
    await dialog.getByLabel("Novo papel").selectOption({ label: "Atendente" });
    await expect(dialog.getByText(warning)).toHaveCount(0);
    await dialog.getByRole("button", { name: "Mudar papel", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(statusText(page, "Papel alterado.")).toBeVisible();
    await expect(row).toContainText("Atendente");
    expect(page.url()).toBe(url);
    expect(await apiRoleOf(user.email)).toBe("SUPPORT");

    await button.click();
    await expect(dialog).toContainText("Papel atual: Atendente");
    const select = dialog.getByLabel("Novo papel");
    await expect(select).toHaveValue("");
    await expect(select.locator("option")).toHaveText(["Selecione o novo papel", "Cliente", "Administrador"]);
    await select.selectOption({ label: "Cliente" });
    await expect(dialog.getByText(warning)).toBeVisible();
    await dialog.getByRole("button", { name: "Mudar papel", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(statusText(page, "Papel alterado.")).toBeVisible();
    await expect(row).toContainText("Cliente");
    expect(await apiRoleOf(user.email)).toBe("CUSTOMER");
  });

  test("duplo clique na confirmação gera uma única mudança", async ({ page }) => {
    const user = await disposableCustomer("papel-duplo");
    const { row, button } = await openUserRow(page, user.email, user.name);

    let actions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) actions += 1;
    });

    await button.click();
    const dialog = roleDialog(page, user.name);
    await dialog.getByLabel("Novo papel").selectOption({ label: "Atendente" });
    await dialog.getByRole("button", { name: "Mudar papel", exact: true }).dblclick();

    await expect(statusText(page, "Papel alterado.")).toBeVisible();
    await expect(row).toContainText("Atendente");
    expect(actions).toBe(1);
    expect(await apiRoleOf(user.email)).toBe("SUPPORT");
  });
});

/** Senha aleatória por teste (nunca a constante `PASSWORD` dos descartáveis). */
function randomPassword() {
  return `e2e-${crypto.randomUUID()}`;
}

async function openNewUser(page: Page) {
  const main = await openUsers(page);
  await main.getByRole("link", { name: "Novo usuário" }).click();
  await expect(page).toHaveURL(/\/usuarios\/novo$/);
  await expect(main.getByRole("heading", { name: "Novo usuário", level: 1 })).toBeVisible();
  return main;
}

/** Preenche o formulário. O papel enviado pelos testes é sempre "Atendente". */
async function fillStaff(main: Locator, data: { name: string; email: string; password: string }) {
  await main.getByLabel("Nome").fill(data.name);
  await main.getByLabel("E-mail").fill(data.email);
  await main.getByLabel("Senha").fill(data.password);
  await main.getByLabel("Papel").selectOption({ label: "Atendente" });
}

function uniqueStaff(tag: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { name: `E2E ${tag} ${id}`, email: uniqueEmail(tag), password: randomPassword() };
}

/** Confere a chegada à lista depois do cadastro e devolve a linha do usuário novo. */
async function expectCreated(page: Page, main: Locator, email: string) {
  await expect(page).toHaveURL(/\/usuarios(\?page=\d+)?[?&]aviso=usuario-cadastrado$/);
  await expect(page.getByRole("status").filter({ hasText: "Usuário cadastrado." })).toBeVisible();

  const { page: userPage } = await findUserPage(email);
  const landed = Number(new URL(page.url()).searchParams.get("page") ?? 1);
  // A página é calculada pelo total lido logo depois do cadastro. Se outro teste
  // cadastrar alguém nesse intervalo e o total cruzar um múltiplo de 25, o novo
  // usuário fica na penúltima página (risco aceito no design).
  expect([userPage, userPage + 1]).toContain(landed);
  if (landed !== userPage) await page.goto(`/usuarios?page=${userPage}`);
  const row = userRow(main, email);
  await expect(row).toBeVisible();
  return row;
}

test.describe("Cadastro de equipe", () => {
  test("Novo usuário abre o formulário com o papel sem seleção", async ({ page }) => {
    const main = await openNewUser(page);

    await expect(main.getByText("Clientes criam a própria conta pelo cadastro público.")).toBeVisible();
    for (const label of ["Nome", "E-mail", "Senha", "Papel"]) {
      await expect(main.getByLabel(label, { exact: true })).toBeVisible();
    }
    const role = main.getByLabel("Papel");
    await expect(role).toHaveValue("");
    await expect(role.locator("option")).toHaveText(["Selecione o papel", "Atendente", "Administrador"]);
    await expect(main.getByRole("button", { name: "Cadastrar usuário" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Cancelar" })).toBeVisible();
  });

  test("erros de validação não cadastram e preservam nome, e-mail e papel", async ({ page }) => {
    const main = await openNewUser(page);
    const data = { ...uniqueStaff("validacao"), name: "A" };
    await fillStaff(main, data);
    await main.getByRole("button", { name: "Cadastrar usuário" }).click();

    await expect(main.getByText("O nome deve ter entre 2 e 100 caracteres.")).toBeVisible();
    await expect(main.getByLabel("Nome")).toHaveAttribute("aria-invalid", "true");
    await expect(main.getByLabel("Nome")).toHaveValue("A");
    await expect(main.getByLabel("E-mail")).toHaveValue(data.email);
    await expect(main.getByLabel("Papel")).toHaveValue("SUPPORT");
    await expect(main.getByLabel("Senha")).toHaveValue("");
    await expect(page).toHaveURL(/\/usuarios\/novo$/);
    expect(await countUsersByEmail(data.email)).toBe(0);

    // E-mail inválido e senha curta, com o nome agora válido.
    await main.getByLabel("Nome").fill("Bruno");
    await main.getByLabel("E-mail").fill("bruno.teste.com");
    await main.getByLabel("Senha").fill("1234567");
    await main.getByRole("button", { name: "Cadastrar usuário" }).click();
    await expect(main.getByText("Informe um e-mail válido.")).toBeVisible();
    await expect(main.getByText("A senha deve ter entre 8 e 128 caracteres.")).toBeVisible();
    await expect(main.getByLabel("Senha")).toHaveAttribute("aria-describedby", /field-password-error/);
  });

  test("e-mail já cadastrado mostra o erro no campo", async ({ page }) => {
    const customer = fixedUser("CUSTOMER");
    const main = await openNewUser(page);
    const data = { ...uniqueStaff("duplicado"), email: customer.email };
    await fillStaff(main, data);
    await main.getByRole("button", { name: "Cadastrar usuário" }).click();

    await expect(main.getByText("Este e-mail já está cadastrado.")).toBeVisible();
    await expect(main.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(main.getByLabel("Nome")).toHaveValue(data.name);
    await expect(main.getByLabel("E-mail")).toHaveValue(customer.email);
    await expect(main.getByLabel("Papel")).toHaveValue("SUPPORT");
    await expect(main.getByLabel("Senha")).toHaveValue("");
  });

  test("cadastra um atendente e chega à última página com o aviso", async ({ page }) => {
    const main = await openNewUser(page);
    const data = uniqueStaff("cadastro");
    await fillStaff(main, data);
    await main.getByRole("button", { name: "Cadastrar usuário" }).click();

    const row = await expectCreated(page, main, data.email);
    await expect(row).toContainText(data.name);
    await expect(row).toContainText("Atendente");
    expect((await findUserPage(data.email)).user.role).toBe("SUPPORT");
  });

  test("duplo clique em Cadastrar usuário cria um único usuário", async ({ page }) => {
    const main = await openNewUser(page);
    const data = uniqueStaff("duplo");
    await fillStaff(main, data);

    let actions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) actions += 1;
    });
    await main.getByRole("button", { name: "Cadastrar usuário" }).dblclick();

    await expectCreated(page, main, data.email);
    expect(actions).toBe(1);
    // Um segundo envio teria voltado com 409 em vez de chegar à lista.
    expect(await countUsersByEmail(data.email)).toBe(1);
  });

  test("Cancelar volta à lista", async ({ page }) => {
    const main = await openNewUser(page);
    await main.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(main.getByRole("heading", { name: "Usuários", level: 1 })).toBeVisible();
  });

  test("aviso desconhecido na URL não é exibido", async ({ page }) => {
    const main = await openUsers(page, `/usuarios?aviso=${encodeURIComponent("<b>oi</b>")}`);
    await expect(userList(main).getByRole("listitem").first()).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /oi|Usuário cadastrado/ })).toHaveCount(0);
    await expect(main.locator("b")).toHaveCount(0);
    await expect(main).not.toContainText("<b>oi</b>");
  });

  test("formulário sem scroll horizontal em 360px e com alvos de 44px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const main = await openNewUser(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    for (const target of [
      main.getByRole("button", { name: "Cadastrar usuário" }),
      main.getByRole("link", { name: "Cancelar" }),
      main.getByLabel("Nome"),
      main.getByLabel("Papel"),
    ]) {
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("Moldura em /usuarios/novo", () => {
  test("breadcrumb de três níveis no desktop e só a página atual no mobile", async ({ page, isMobile }) => {
    await openNewUser(page);
    const crumbs = page.getByRole("navigation", { name: "Você está em" });
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText("Novo usuário");

    if (isMobile) {
      await expect(crumbs.getByRole("link", { name: "Painel" })).toBeHidden();
      await expect(crumbs.getByRole("link", { name: "Usuários" })).toBeHidden();
    } else {
      await expect(crumbs.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/dashboard");
      await expect(crumbs.getByRole("link", { name: "Usuários" })).toHaveAttribute("href", "/usuarios");
      await expect(crumbs).toHaveText(/^Painel\s*\/\s*Usuários\s*\/\s*Novo usuário$/);
      // "Usuários" continua ativo na sidebar.
      await expect(page.locator("aside").getByRole("link", { name: "Usuários" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });
});
